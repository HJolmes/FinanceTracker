import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchPriceHistory, lookupTicker, calcPerformance } from "../services/marketDataService";

const RANGES = ["1mo", "3mo", "6mo", "1y", "5y"];
const RANGE_LABELS = { "1mo": "1M", "3mo": "3M", "6mo": "6M", "1y": "1J", "5y": "5J" };

function fmt(n, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(n || 0);
}

export default function ETFChart({ ticker: initTicker, isin, name, anteile }) {
  const [ticker, setTicker] = useState(initTicker || "");
  const [range, setRange] = useState("1y");
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticker && (isin || name)) {
      lookupTicker(isin || name).then(setTicker).catch(() => {});
    }
  }, [ticker, isin, name]);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError("");
    fetchPriceHistory(ticker, range)
      .then((d) => { setChartData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [ticker, range]);

  if (!ticker && !isin && !name) return null;
  if (!ticker) return <div style={{ color: "var(--text3)", fontSize: 13 }}>Ticker wird gesucht…</div>;

  const perf = chartData ? calcPerformance(chartData.points) : null;
  const currentPrice = chartData?.currentPrice;
  const currency = chartData?.currency || "EUR";
  const depotwert = anteile && currentPrice ? parseFloat(anteile) * currentPrice : null;
  const lineColor = perf !== null && perf >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{ticker}</span>
        {currentPrice && <span style={{ color: "var(--text2)", fontSize: 13 }}>{fmt(currentPrice, currency)}</span>}
        {perf !== null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: perf >= 0 ? "var(--green)" : "var(--red)" }}>
            {perf >= 0 ? "+" : ""}{perf.toFixed(2)}%
          </span>
        )}
        {depotwert && <span style={{ color: "var(--accent)", fontSize: 13 }}>Depot: {fmt(depotwert, currency)}</span>}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRange(r)}
            style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, background: r === range ? "var(--accent)" : "var(--bg3)", color: r === range ? "#0f1923" : "var(--text2)", border: "none", cursor: "pointer" }}>
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "var(--text3)", fontSize: 13 }}>Lade Kursdaten…</div>}
      {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
      {chartData?.points?.length > 0 && !loading && (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData.points}>
            <XAxis dataKey="date" tick={{ fill: "var(--text3)", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fill: "var(--text3)", fontSize: 10 }} domain={["auto", "auto"]} width={55} tickFormatter={(v) => v.toFixed(0)} />
            <Tooltip formatter={(v) => fmt(v, currency)} labelFormatter={(l) => l} />
            <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
