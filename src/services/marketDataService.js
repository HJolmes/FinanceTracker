// Price data: Yahoo Finance (no API key, CORS via query1→query2 fallback).
// ISIN→Ticker: OpenFIGI API (Bloomberg, free, CORS-friendly, 25 req/min).

const YF1 = "https://query1.finance.yahoo.com";
const YF2 = "https://query2.finance.yahoo.com";
const OPENFIGI = "https://api.openfigi.com/v3/mapping";
const CACHE = {};
const TICKER_CACHE = {};
const TTL = 15 * 60 * 1000;
const TICKER_TTL = 60 * 60 * 1000;
const INTERVAL_FOR = { "1mo": "1d", "3mo": "1d", "6mo": "1wk", "1y": "1wk", "5y": "1mo" };

// Yahoo Finance exchange suffix map
const EXCH_SUFFIX = {
  XETR: ".DE", XAMS: ".AS", XPAR: ".PA", XLON: ".L",
  XHEL: ".HE", XMIL: ".MI", XSTO: ".ST", XOSL: ".OL",
};
// Preferred exchanges for European users (XETR = XETRA/Frankfurt first)
const PREFERRED_EXCH = ["XETR", "XAMS", "XPAR", "XLON"];

async function yffetch(path) {
  try {
    const res = await fetch(`${YF1}${path}`);
    if (res.ok) return res;
  } catch {}
  return fetch(`${YF2}${path}`);
}

async function lookupByISIN(isin) {
  const res = await fetch(OPENFIGI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const data = (json[0]?.data || []).filter((d) => d.ticker);
  if (!data.length) return null;
  for (const exch of PREFERRED_EXCH) {
    const hit = data.find((d) => d.exchCode === exch);
    if (hit) return hit.ticker + (EXCH_SUFFIX[exch] || "");
  }
  const first = data[0];
  return first.ticker + (EXCH_SUFFIX[first.exchCode] || "");
}

export async function lookupTicker(query) {
  if (!query) return null;
  const trimmed = query.trim();
  const k = `t:${trimmed.toLowerCase()}`;
  if (TICKER_CACHE[k] && Date.now() - TICKER_CACHE[k].ts < TICKER_TTL) return TICKER_CACHE[k].v;

  let ticker = null;

  // ISIN: 2 letters + 10 alphanumeric → use OpenFIGI (more reliable than YF search for ISINs)
  if (/^[A-Za-z]{2}[A-Za-z0-9]{10}$/.test(trimmed)) {
    try { ticker = await lookupByISIN(trimmed.toUpperCase()); } catch {}
  }

  // Fallback: Yahoo Finance name search
  if (!ticker) {
    try {
      const res = await yffetch(
        `/v1/finance/search?q=${encodeURIComponent(trimmed)}&quotesCount=5&newsCount=0&listsCount=0`
      );
      if (res.ok) {
        const json = await res.json();
        const hit = json.quotes?.find((q) =>
          ["ETF", "EQUITY", "MUTUALFUND"].includes(q.quoteType)
        );
        ticker = hit?.symbol || null;
      }
    } catch {}
  }

  TICKER_CACHE[k] = { v: ticker, ts: Date.now() };
  return ticker;
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
