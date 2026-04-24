// src/components/Settings.js
import React, { useState } from "react";
import { getSettings, saveSettings } from "../services/settingsService";
import { getClaudeApiKey, saveClaudeApiKey } from "../services/claudeService";

export default function Settings() {
  const [settings, setSettings] = useState(getSettings());
  const [claudeKey, setClaudeKey] = useState(getClaudeApiKey());
  const [savedPath, setSavedPath] = useState(false);
  const [savedKey, setSavedKey] = useState(false);

  const handlePathChange = (value) => {
    setSettings((prev) => ({ ...prev, oneDriveFolderPath: value.replace(/^\/+|\/+$/g, "") }));
  };

  const handleSavePath = () => {
    const path = settings.oneDriveFolderPath.trim();
    if (!path) { alert("Bitte einen Ordnerpfad eingeben."); return; }
    saveSettings({ ...settings, oneDriveFolderPath: path });
    setSavedPath(true);
    setTimeout(() => setSavedPath(false), 2500);
  };

  const handleSaveKey = () => {
    saveClaudeApiKey(claudeKey);
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2500);
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
        <div style={{ fontSize: 15, fontWeight: 600 }}>☁️ OneDrive-Speicherpfad</div>
        <div>
          <label>Pfad (relativ zur OneDrive-Wurzel)</label>
          <input
            type="text"
            value={settings.oneDriveFolderPath}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder="z.B. Desktop/Privat/Finanzen"
          />
        </div>
        <div style={{
          background: "var(--bg3)", borderRadius: "var(--radius-sm)",
          padding: "12px 14px", fontSize: 12, color: "var(--text3)", lineHeight: 1.8,
        }}>
          <div style={{ color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>Speicherorte:</div>
          <div>📄 <code>{previewPath}/data.json</code></div>
          <div>📁 <code>{previewPath}/Dokumente/&lt;kategorie&gt;/</code></div>
        </div>
        <button className="btn-primary" onClick={handleSavePath} style={{ alignSelf: "flex-start", minWidth: 180 }}>
          {savedPath ? "✓ Gespeichert" : "Pfad speichern"}
        </button>
      </div>

      {/* Claude API Key */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>🤖 Claude API-Key (KI-Erkennung)</div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            Wird benötigt, damit die KI nach dem OCR-Scan die Felder automatisch befüllt.
            Deinen Key findest du unter{" "}
            <code style={{ fontSize: 11, background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>console.anthropic.com</code>.
          </div>
        </div>
        <div>
          <label>API-Key</label>
          <input
            type="password"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          ⚠️ Der Key wird nur in diesem Browser gespeichert (localStorage) und nie an Dritte gesendet — nur direkt an die Anthropic API.
        </div>
        <button className="btn-primary" onClick={handleSaveKey} style={{ alignSelf: "flex-start", minWidth: 180 }}>
          {savedKey ? "✓ Gespeichert" : "Key speichern"}
        </button>
      </div>

      {/* Info */}
      <div className="card" style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>ℹ️ Hinweis</div>
        <p>Wenn du den OneDrive-Pfad änderst, werden bestehende Daten <em>nicht</em> automatisch verschoben. Bitte kopiere sie manuell in OneDrive.</p>
      </div>
    </div>
  );
}
