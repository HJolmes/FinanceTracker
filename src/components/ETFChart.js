import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fetchChartData, calcPerformance, lookupTicker } from "../services/marketDataService";

const RANGES = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1J", value: "1y" },
  { label: "5J", value: "5y" },
];

function fmt(val, currency) {
  return val != null
    ? val.toLocaleString("de-DE", { style: "currency", currency: currency || "EUR", minimumFractionDigits: 2 })
    : "–";
}

const CustomTooltip = ({ active, payload, currency }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg2)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <div style={{ color: "var(--text3)", marginBottom: 2 }}>{p.date}</div>
      <div style={{ color: "var(--accent)", fontWeight: 600 }}>{fmt(p.price, currency)}</div>
    </div>
  );
};

export default function ETFChart({ ticker: tickerProp, isin, entryName, anteile, sparrate }) {
  const [ticker, setTicker] = useState(tickerProp || "");
  const [range, setRange] = useState("1y");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState("");

  // Resolve ticker from prop, or auto-lookup from ISIN / name
  useEffect(() => {
    if (tickerProp) { setTicker(tickerProp); return; }
    const query = isin || entryName;
    if (!query) return;
    setLookingUp(true);
    setError("");
    lookupTicker(query)
      .then((found) => {
        setLookingUp(false);
        if (found) setTicker(found);
        else setError("Kein Ticker gefunden – bitte manuell im Eintrag hinterlegen");
      })
      .catch(() => setLookingUp(false));
  }, [tickerProp, isin, entryName]);

  // Fetch chart data once ticker is known
  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError("");
    setData(null);
    fetchChartData(ticker, range)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [ticker, range]);

  if (lookingUp) {
    return (
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>
        🔍 Ticker wird gesucht…
      </div>
    );
  }

  if (!ticker) {
    return (
      <div style={{ fontSize: 12, color: error ? "var(--red)" : "var(--text3)", padding: "8px 0" }}>
        {error || "Kein Ticker – ISIN oder Name ergänzen für automatischen Kursverlauf"}
      </div>
    );
  }

  const perf = data ? calcPerformance(data.points) : null;
  const perfPositive = perf != null && perf >= 0;
  const lineColor = perf == null ? "var(--accent)" : perf >= 0 ? "#22c55e" : "#ef4444";

  const portfolioValue =
    data?.currentPrice != null && anteile
      ? parseFloat(anteile) * data.currentPrice
      : null;

  const prices = data?.points.map((p) => p.price) || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const pricePad = maxPrice !== minPrice ? (maxPrice - minPrice) * 0.05 : 1;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header: name + current price + performance */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 500 }}>
          {data?.name || ticker}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {data?.currentPrice != null && (
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {fmt(data.currentPrice, data.currency)}
            </span>
          )}
          {perf != null && (
            <span style={{
              fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px",
              background: perfPositive ? "#dcfce7" : "#fee2e2",
              color: perfPositive ? "#15803d" : "#b91c1c",
            }}>
              {perfPositive ? "+" : ""}{perf.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Range buttons */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            style={{
              fontSize: 11, padding: "3px 9px", borderRadius: 6, border: "1px solid var(--border)",
              background: range === r.value ? "var(--accent)" : "var(--bg3)",
              color: range === r.value ? "#fff" : "var(--text2)",
              cursor: "pointer", fontWeight: range === r.value ? 600 : 400,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>
          Kursdaten werden geladen…
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: "var(--red)", padding: "8px 0" }}>⚠ {error}</div>
      )}
      {!loading && !error && data && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={[minPrice - pricePad, maxPrice + pricePad]} hide />
            <Tooltip content={<CustomTooltip currency={data.currency} />} />
            {data.points.length > 0 && (
              <ReferenceLine y={data.points[0].price} stroke="var(--border)" strokeDasharray="3 3" />
            )}
            <Line type="monotone" dataKey="price" dot={false} stroke={lineColor} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Portfolio value */}
      {portfolioValue != null && (
        <div style={{
          marginTop: 10, display: "flex", justifyContent: "space-between",
          background: "var(--bg3)", borderRadius: 8, padding: "8px 12px",
        }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            Depotwert ({parseFloat(anteile).toLocaleString("de-DE")} Anteile)
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
            {fmt(portfolioValue, data.currency)}
          </span>
        </div>
      )}
      {!portfolioValue && sparrate && data?.currentPrice != null && (
        <div style={{
          marginTop: 10, fontSize: 12, color: "var(--text3)",
          background: "var(--bg3)", borderRadius: 8, padding: "8px 12px",
        }}>
          Sparrate {parseFloat(sparrate).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} /Monat
        </div>
      )}
    </div>
  );
}
