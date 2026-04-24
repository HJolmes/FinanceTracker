// src/components/Dashboard.js
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#e8a838", "#4a9eff", "#3dd68c", "#a78bfa", "#f06060"];

const CATEGORIES = {
  versicherungen: { label: "Versicherungen", icon: "🛡️" },
  sparplaene: { label: "Sparpläne", icon: "📈" },
  leasing: { label: "Leasing & Kredite", icon: "🚗" },
  bankkonten: { label: "Bankkonten", icon: "🏦" },
};

function sumMonthly(entries) {
  return entries.reduce((sum, e) => {
    const b = parseFloat(e.beitrag || e.rate || e.betrag || 0);
    if (e.intervall === "jährlich") return sum + b / 12;
    if (e.intervall === "quartalsweise") return sum + b / 3;
    return sum + b;
  }, 0);
}

function sumSavings(entries) {
  return entries.reduce((sum, e) => sum + parseFloat(e.betrag || e.beitrag || 0), 0);
}

export default function Dashboard({ data }) {
  const monthlyKosten = {
    versicherungen: sumMonthly(data.versicherungen || []),
    sparplaene: sumMonthly(data.sparplaene || []),
    leasing: sumMonthly(data.leasing || []),
    bankkonten: 0,
  };

  const totalMonthly = Object.values(monthlyKosten).reduce((a, b) => a + b, 0);
  const totalYearly = totalMonthly * 12;

  const pieData = Object.entries(monthlyKosten)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: CATEGORIES[key].label, value: Math.round(value * 100) / 100 }));

  const totalEntries = Object.values(data).filter(Array.isArray).flat().length;
  const lastUpdated = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "–";

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero card */}
      <div style={{
        background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)",
        border: "1px solid var(--border)", borderRadius: 16, padding: "24px 20px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -20, right: -20,
          width: 120, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(232,168,56,0.15) 0%, transparent 70%)",
        }} />
        <div style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Monatliche Gesamtausgaben
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "var(--accent)", letterSpacing: "-0.02em" }}>
          {totalMonthly.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
        </div>
        <div style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>
          {totalYearly.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} / Jahr
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <div style={{ color: "var(--text3)", fontSize: 12 }}>📋 {totalEntries} Einträge</div>
          <div style={{ color: "var(--text3)", fontSize: 12 }}>🔄 Stand: {lastUpdated}</div>
        </div>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", marginBottom: 16 }}>Verteilung monatl. Kosten</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                {d.name}: {d.value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => {
          const entries = data[key] || [];
          const monthly = monthlyKosten[key];
          return (
            <div key={key} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text)" }}>
                {monthly > 0
                  ? monthly.toLocaleString("de-DE", { style: "currency", currency: "EUR" })
                  : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{entries.length} Einträge</div>
            </div>
          );
        })}
      </div>

      {totalEntries === 0 && (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: "32px 0", fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          Noch keine Einträge – wähle unten eine Kategorie und lege los!
        </div>
      )}
    </div>
  );
}
