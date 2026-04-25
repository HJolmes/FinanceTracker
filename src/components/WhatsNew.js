// src/components/WhatsNew.js
import React from "react";
import { APP_VERSION, APP_CHANGELOG } from "../version";

export default function WhatsNew({ onClose }) {
  const log = APP_CHANGELOG[APP_VERSION];
  if (!log) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg2)", borderRadius: 16, width: "100%", maxWidth: 460,
          maxHeight: "88vh", overflow: "auto", boxShadow: "var(--shadow)",
          animation: "fadeIn 0.3s ease",
        }}
      >
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
            Was ist neu
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: "-0.02em" }}>
            Finance<span style={{ color: "var(--accent)" }}>Tracker</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, marginBottom: 20 }}>
            {APP_VERSION} · {log.date}
          </div>
        </div>

        <div style={{ padding: "0 24px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
          {log.entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 14, padding: "13px 15px",
                background: "var(--surface)", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{entry.emoji}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{entry.title}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{entry.desc}</div>
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={onClose} style={{ marginTop: 6 }}>
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
