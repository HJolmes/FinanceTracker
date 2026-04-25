// src/components/NavBar.js
import React from "react";
import { APP_VERSION } from "../version";

const TABS = [
  { id: "dashboard", label: "Übersicht", icon: "◈" },
  { id: "versicherungen", label: "Versicher.", fullLabel: "Versicherungen", icon: "🛡️" },
  { id: "sparplaene", label: "Sparpläne", icon: "📈" },
  { id: "leasing", label: "Leasing", icon: "🚗" },
  { id: "bankkonten", label: "Konten", fullLabel: "Bankkonten", icon: "🏦" },
];

export default function NavBar({ active, onChange, mode = "bottom", syncing, onSettings, onLogout }) {
  if (mode === "sidebar") {
    return (
      <div style={{
        width: 220, background: "var(--bg2)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", flexShrink: 0, height: "100%",
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.02em" }}>
            Finance<span style={{ color: "var(--accent)" }}>Tracker</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
            <span style={{ marginRight: 6 }}>{APP_VERSION}</span>
            {syncing ? "⟳ Sync…" : "✓ OneDrive"}
          </div>
        </div>

        <div style={{ flex: 1, paddingTop: 8 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 12, padding: "11px 20px", background: "transparent",
                borderLeft: active === tab.id ? "3px solid var(--accent)" : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{
                fontSize: 14,
                color: active === tab.id ? "var(--accent)" : "var(--text2)",
                fontWeight: active === tab.id ? 600 : 400,
              }}>{tab.fullLabel || tab.label}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingBottom: 8 }}>
          <button
            onClick={onSettings}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: 12, padding: "11px 20px", background: "transparent",
              borderLeft: active === null ? "3px solid var(--accent)" : "3px solid transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚙️</span>
            <span style={{
              fontSize: 14,
              color: active === null ? "var(--accent)" : "var(--text2)",
              fontWeight: active === null ? 600 : 400,
            }}>Einstellungen</span>
          </button>
          <button
            onClick={onLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: 12, padding: "11px 20px", background: "transparent",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>🚪</span>
            <span style={{ fontSize: 14, color: "var(--text3)" }}>Abmelden</span>
          </button>
        </div>
      </div>
    );
  }

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
