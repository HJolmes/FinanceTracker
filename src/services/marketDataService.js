// Fetches historical price data from Yahoo Finance (no API key required).
// Results are cached for 15 minutes to avoid redundant requests.
// Ticker lookup cached for 1 hour.

const YF1 = "https://query1.finance.yahoo.com";
const YF2 = "https://query2.finance.yahoo.com";
const CACHE = {};
const TICKER_CACHE = {};
const TTL = 15 * 60 * 1000;
const TICKER_TTL = 60 * 60 * 1000;

const INTERVAL_FOR = { "1mo": "1d", "3mo": "1d", "6mo": "1wk", "1y": "1wk", "5y": "1mo" };

async function yffetch(path) {
  try {
    const res = await fetch(`${YF1}${path}`);
    if (res.ok) return res;
  } catch {}
  return fetch(`${YF2}${path}`);
}

export async function lookupTicker(query) {
  if (!query) return null;
  const k = `t:${query.trim().toLowerCase()}`;
  if (TICKER_CACHE[k] && Date.now() - TICKER_CACHE[k].ts < TICKER_TTL) return TICKER_CACHE[k].v;
  try {
    const res = await yffetch(
      `/v1/finance/search?q=${encodeURIComponent(query.trim())}&quotesCount=5&newsCount=0&listsCount=0`
    );
    if (!res.ok) { TICKER_CACHE[k] = { v: null, ts: Date.now() }; return null; }
    const json = await res.json();
    const hit = json.quotes?.find((q) => ["ETF", "EQUITY", "MUTUALFUND"].includes(q.quoteType));
    const ticker = hit?.symbol || null;
    TICKER_CACHE[k] = { v: ticker, ts: Date.now() };
    return ticker;
  } catch {
    return null;
  }
}

export async function fetchChartData(ticker, range = "1y") {
  const key = `${ticker}:${range}`;
  if (CACHE[key] && Date.now() - CACHE[key].ts < TTL) return CACHE[key].data;

  const interval = INTERVAL_FOR[range] || "1wk";
  const path =
    `/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=${range}&interval=${interval}&includePrePost=false&events=div`;

  const res = await yffetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const result = json.chart?.result?.[0];
  if (!result) {
    const msg = json.chart?.error?.description || "Ticker nicht gefunden";
    throw new Error(msg);
  }

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const meta = result.meta || {};

  const points = timestamps
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), price: closes[i] }))
    .filter((p) => p.price != null && !isNaN(p.price))
    .map((p) => ({ ...p, price: Math.round(p.price * 100) / 100 }));

  const data = {
    points,
    currency: meta.currency || "EUR",
    currentPrice: meta.regularMarketPrice ?? points[points.length - 1]?.price ?? null,
    name: meta.longName || meta.shortName || ticker,
  };

  CACHE[key] = { data, ts: Date.now() };
  return data;
}

export function calcPerformance(points) {
  if (!points || points.length < 2) return null;
  const first = points.find((p) => p.price != null)?.price;
  const last = [...points].reverse().find((p) => p.price != null)?.price;
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}
