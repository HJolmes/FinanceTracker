import React, { useState, useEffect } from "react";
import { generateKuendigungsschreiben, hasApiKey } from "../services/claudeService";

export default function KuendigungsModal({ entry, category, onClose }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("brief");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hasApiKey()) {
      setError("Kein Claude API-Key konfiguriert. Bitte in den Einstellungen hinterlegen.");
      setLoading(false);
      return;
    }
    generateKuendigungsschreiben(entry, category)
      .then((r) => { setResult(r); })
      .catch((e) => setError(`Fehler: ${e.message}`))
      .finally(() => setLoading(false));
  }, [entry, category]);

  function copyBrief() {
    if (result?.brief) {
      navigator.clipboard.writeText(result.brief).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const mailtoLink = result?.email
    ? `mailto:${result.email}?subject=${encodeURIComponent(`Kündigung: ${entry.name || entry.anbieter || "Vertrag"}`)}&body=${encodeURIComponent(result.brief || "")}`
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxHeight: "92dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🔴 Kündigung – {entry.name || entry.anbieter || "Vertrag"}</span>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--accent)" }}>
            🤖 KI erstellt Kündigungsschreiben…
          </div>
        )}

        {error && <div className="alert alert-red">{error}</div>}

        {result && !loading && (
          <>
            {result.anleitung && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button className={tab === "brief" ? "btn-primary" : "btn-secondary"} style={{ flex: 1, fontSize: 13 }} onClick={() => setTab("brief")}>
                  ✉️ Schreiben
                </button>
                <button className={tab === "anleitung" ? "btn-primary" : "btn-secondary"} style={{ flex: 1, fontSize: 13 }} onClick={() => setTab("anleitung")}>
                  📋 Anleitung
                </button>
              </div>
            )}

            {tab === "brief" && (
              <>
                {result.email && (
                  <div className="alert alert-gold" style={{ marginBottom: 12, fontSize: 13 }}>
                    ✉️ Empfänger: <strong>{result.email}</strong>
                  </div>
                )}
                {!result.email && (
                  <div style={{ color: "var(--text3)", fontSize: 13, marginBottom: 10 }}>
                    Keine E-Mail-Adresse gefunden. Bitte Anleitung-Tab für alternative Kündigungswege beachten.
                  </div>
                )}
                <textarea
                  readOnly
                  value={result.brief || ""}
                  rows={12}
                  style={{ width: "100%", fontFamily: "inherit", fontSize: 13, resize: "vertical", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, padding: 10 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={copyBrief}>
                    {copied ? "✓ Kopiert" : "📋 Kopieren"}
                  </button>
                  {mailtoLink && (
                    <a href={mailtoLink} className="btn-primary" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
                      ✉️ E-Mail öffnen
                    </a>
                  )}
                </div>
              </>
            )}

            {tab === "anleitung" && result.anleitung && (
              <ol style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
                {result.anleitung.map((step, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>{step}</li>
                ))}
              </ol>
            )}
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <button className="btn-ghost" style={{ width: "100%" }} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}
