import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../services/authConfig";

const FEATURES = [
  { icon: "🛡️", title: "Versicherungen", desc: "Alle Policen im Überblick" },
  { icon: "📈", title: "Sparpläne & ETFs", desc: "Live-Kursdaten & Depotübersicht" },
  { icon: "🤖", title: "KI-Dokumentenscan", desc: "PDF & Bilder automatisch auslesen" },
  { icon: "☁️", title: "OneDrive-Sync", desc: "Daten sicher im eigenen Cloud-Speicher" },
];

export default function LoginScreen() {
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      await instance.loginPopup(loginRequest);
    } catch (e) {
      if (!e.message?.includes("user_cancelled")) {
        setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      gap: "32px",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>💰</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>
          FinanceTracker
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 15 }}>Meine Finanzen – alles an einem Ort</p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        width: "100%",
        maxWidth: 520,
      }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="card" style={{ textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
            <div style={{ color: "var(--text3)", fontSize: 12 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-red" style={{ maxWidth: 360, width: "100%" }}>{error}</div>}

      <button
        className="btn-primary"
        style={{ width: "100%", maxWidth: 360, padding: "14px 24px", fontSize: 16 }}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Anmelden…" : "🔑 Mit Microsoft anmelden"}
      </button>

      <p style={{ color: "var(--text3)", fontSize: 12, textAlign: "center", maxWidth: 340 }}>
        Deine Daten werden ausschließlich in deinem eigenen OneDrive gespeichert.
        Anthropic hat keinen Zugriff auf deine Finanzdaten.
      </p>
    </div>
  );
}
