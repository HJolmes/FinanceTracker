// src/components/Settings.js
import React, { useState } from "react";
import { getSettings, saveSettings } from "../services/settingsService";

export default function Settings() {
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);

  const handlePathChange = (value) => {
    // Strip leading/trailing slashes
    setSettings((prev) => ({ ...prev, oneDriveFolderPath: value.replace(/^\/+|\/+$/g, "") }));
  };

  const handleSave = () => {
    const path = settings.oneDriveFolderPath.trim();
    if (!path) {
      alert("Bitte einen Ordnerpfad eingeben.");
      return;
    }
    saveSettings({ ...settings, oneDriveFolderPath: path });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const previewPath = settings.oneDriveFolderPath || "…";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 4 }}>Einstellungen</div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>App-Konfiguration</div>
      </div>

      {/* OneDrive Path */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>☁️ OneDrive-Speicherpfad</div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            Ordner in deinem OneDrive, in dem Daten und Dokumente gespeichert werden.
            Unterordner mit{" "}
            <code style={{ background: "var(--bg3)", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>/</code>
            {" "}trennen.
          </div>
        </div>

        <div>
          <label>Pfad (relativ zur OneDrive-Wurzel)</label>
          <input
            type="text"
            value={settings.oneDriveFolderPath}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder="z.B. Privat/Finanzen/FinanceTracker"
          />
        </div>

        {/* Live preview */}
        <div style={{
          background: "var(--bg3)", borderRadius: "var(--radius-sm)",
          padding: "12px 14px", fontSize: 12, color: "var(--text3)", lineHeight: 1.8,
        }}>
          <div style={{ color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>Vorschau der Speicherorte:</div>
          <div>📄 <code>{previewPath}/data.json</code></div>
          <div>📁 <code>{previewPath}/Dokumente/&lt;kategorie&gt;/</code></div>
          <div style={{ marginTop: 8, color: "var(--text3)", fontSize: 11 }}>
            Beispiele: <code>FinanceTracker</code> · <code>Privat/Finanzen/FinanceTracker</code>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ alignSelf: "flex-start", minWidth: 180 }}
        >
          {saved ? "✓ Gespeichert" : "Einstellungen speichern"}
        </button>
      </div>

      {/* Info */}
      <div className="card" style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>ℹ️ Hinweis</div>
        <p>Der Pfad wird in diesem Browser gespeichert und wirkt sofort. PDFs liegen direkt
        in OneDrive und sind dort ohne die App lesbar.</p>
        <p style={{ marginTop: 8 }}>
          <strong style={{ color: "var(--text)" }}>Wichtig:</strong> Wenn du den Pfad änderst,
          werden bestehende Daten <em>nicht</em> automatisch in den neuen Ordner verschoben.
          Bitte kopiere sie manuell in OneDrive.
        </p>
      </div>
    </div>
  );
}
