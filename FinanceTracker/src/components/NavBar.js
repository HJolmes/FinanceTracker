// src/components/NavBar.js
import React from "react";

const TABS = [
  { id: "dashboard", label: "Übersicht", icon: "◈" },
  { id: "versicherungen", label: "Versicher.", icon: "🛡️" },
  { id: "sparplaene", label: "Sparpläne", icon: "📈" },
  { id: "leasing", label: "Leasing", icon: "🚗" },
  { id: "bankkonten", label: "Konten", icon: "🏦" },
];

export default function NavBar({ active, onChange }) {
  return (
    <div style={{
      display: "flex", background: "var(--bg2)",
      borderTop: "1px solid var(--border)", flexShrink: 0,
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "10px 4px", gap: 3, background: "transparent",
            borderTop: active === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
            transition: "all 0.15s",
          }}
        >
          <span style={{ fontSize: 18 }}>{tab.icon}</span>
          <span style={{
            fontSize: 10, color: active === tab.id ? "var(--accent)" : "var(--text3)",
            fontWeight: active === tab.id ? 600 : 400, letterSpacing: "0.02em",
          }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
