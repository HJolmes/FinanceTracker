const PRICE_CACHE = new Map();
const TICKER_CACHE = new Map();
const PRICE_TTL = 15 * 60 * 1000;
const TICKER_TTL = 60 * 60 * 1000;

const RANGE_INTERVAL = {
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1wk",
  "1y": "1wk",
  "5y": "1mo",
};

const PREFERRED_MICS = { XETR: ".DE", XAMS: ".AS", XPAR: ".PA", XLON: ".L" };

async function yahooChart(ticker, range) {
  const interval = RANGE_INTERVAL[range] || "1d";
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      const meta = result.meta || {};
      const points = timestamps
        .map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().slice(0, 10),
          price: closes[i],
        }))
        .filter((p) => p.price != null);
      return { points, currency: meta.currency || "EUR", currentPrice: meta.regularMarketPrice };
    } catch {}
  }
  throw new Error(`Keine Kursdaten für ${ticker}`);
}

export async function fetchPriceHistory(ticker, range = "1y") {
  const key = `${ticker}:${range}`;
  const cached = PRICE_CACHE.get(key);
  if (cached && Date.now() - cached.ts < PRICE_TTL) return cached.data;
  const data = await yahooChart(ticker, range);
  PRICE_CACHE.set(key, { ts: Date.now(), data });
  return data;
}

export async function lookupTicker(query) {
  const cached = TICKER_CACHE.get(query);
  if (cached && Date.now() - cached.ts < TICKER_TTL) return cached.ticker;

  const isIsin = /^[A-Z]{2}[A-Z0-9]{10}$/.test(query);
  if (isIsin) {
    try {
      const res = await fetch("https://api.openfigi.com/v3/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ idType: "ID_ISIN", idValue: query }]),
      });
      if (res.ok) {
        const json = await res.json();
        const hits = json?.[0]?.data || [];
        for (const mic of Object.keys(PREFERRED_MICS)) {
          const hit = hits.find((h) => h.exchCode === mic || h.marketSecDes === mic);
          if (hit) {
            const ticker = hit.ticker + PREFERRED_MICS[mic];
            TICKER_CACHE.set(query, { ts: Date.now(), ticker });
            return ticker;
          }
        }
        if (hits[0]?.ticker) {
          const ticker = hits[0].ticker;
          TICKER_CACHE.set(query, { ts: Date.now(), ticker });
          return ticker;
        }
      }
    } catch {}
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`
    );
    if (res.ok) {
      const json = await res.json();
      const symbol = json?.quotes?.[0]?.symbol;
      if (symbol) {
        TICKER_CACHE.set(query, { ts: Date.now(), ticker: symbol });
        return symbol;
      }
    }
  } catch {}

  throw new Error(`Kein Ticker für "${query}" gefunden`);
}

export function calcPerformance(points) {
  if (!points || points.length < 2) return 0;
  const first = points[0].price;
  const last = points[points.length - 1].price;
  return ((last - first) / first) * 100;
}
