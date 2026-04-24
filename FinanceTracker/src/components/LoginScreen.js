// src/components/LoginScreen.js
import React from "react";

export default function LoginScreen({ onLogin }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", padding: 40, textAlign: "center",
    }}>
      {/* Logo / Title */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), var(--surface2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(232,168,56,0.3)",
        }}>💰</div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 36,
          color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 8,
        }}>
          Finance<span style={{ color: "var(--accent)" }}>Tracker</span>
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 15, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Dein persönlicher Manager für Versicherungen, Sparpläne & Finanzen
        </p>
      </div>

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48, width: "100%", maxWidth: 280 }}>
        {[
          ["🛡️", "Versicherungen im Überblick"],
          ["📈", "Sparpläne & ETFs tracken"],
          ["🏦", "Kredite & Leasing verwalten"],
          ["☁️", "Sicher in OneDrive gespeichert"],
        ].map(([icon, text]) => (
          <div key={text} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--surface)", borderRadius: "var(--radius-sm)",
            padding: "12px 16px", border: "1px solid var(--border)", textAlign: "left",
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 14, color: "var(--text2)" }}>{text}</span>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={onLogin} style={{ width: "100%", maxWidth: 280, padding: "16px 24px", fontSize: 16 }}>
        Mit Microsoft anmelden
      </button>
      <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 16 }}>
        Deine Daten werden sicher in deinem OneDrive gespeichert
      </p>
    </div>
  );
}
