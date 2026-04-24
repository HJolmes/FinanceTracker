import React, { useState } from "react";
import { getSettings, saveSettings } from "../services/settingsService";
import { getClaudeApiKey, saveClaudeApiKey } from "../services/claudeService";

export default function Settings() {
  const [settings, setSettings] = useState(getSettings());
  const [claudeKey, setClaudeKey] = useState(getClaudeApiKey());
  const [savedPath, setSavedPath] = useState(false);
  const [savedKey, setSavedKey] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState(false);

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

  const handleSavePersonal = () => {
    saveSettings({ ...settings });
    setSavedPersonal(true);
    setTimeout(() => setSavedPersonal(false), 2500);
  };

  const previewPath = settings.oneDriveFolderPath || "…";
  const currentYear = new Date().getFullYear();
  const geburtsjahr = parseInt(settings.geburtsjahr);
  const alter = !isNaN(geburtsjahr) && geburtsjahr > 1900 ? currentYear - geburtsjahr : null;
  const jahreZu67 = alter !== null ? Math.max(0, 67 - alter) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 4 }}>Einstellungen</div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>App-Konfiguration</div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>👤 Persönliche Daten</div>
        <div>
          <label>Geburtsjahr</label>
          <input
            type="number"
            value={settings.geburtsjahr || ""}
            onChange={(e) => setSettings((p) => ({ ...p, geburtsjahr: e.target.value }))}
            placeholder="z.B. 1990"
            min="1900"
            max={currentYear}
          />
        </div>
        {alter !== null && (
          <div style={{ background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 12, color: "var(--text3)", lineHeight: 1.8 }}>
            <div>Aktuelles Alter: <span style={{ color: "var(--text)", fontWeight: 600 }}>{alter} Jahre</span></div>
            {jahreZu67 > 0
              ? <div>Jahre bis zur Rente (67): <span style={{ color: "var(--accent)", fontWeight: 600 }}>{jahreZu67} Jahre</span></div>
              : <div style={{ color: "var(--green)", fontWeight: 600 }}>Rentenalter bereits erreicht</div>
            }
          </div>
        )}
        <button className="btn-primary" onClick={handleSavePersonal} style={{ alignSelf: "flex-start", minWidth: 180 }}>
          {savedPersonal ? "✓ Gespeichert" : "Speichern"}
        </button>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>☁️ OneDrive-Speicherpfad</div>
        <div>
          <label>Pfad (relativ zur OneDrive-Wurzel)</label>
          <input type="text" value={settings.oneDriveFolderPath}
            onChange={(e) => setSettings((p) => ({ ...p, oneDriveFolderPath: e.target.value.replace(/^\/+|\/+$/g, "") }))}
            placeholder="z.B. Desktop/Privat/Finanzen" />
        </div>
        <div style={{ background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 12, color: "var(--text3)", lineHeight: 1.8 }}>
          <div style={{ color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>Speicherorte:</div>
          <div>📄 <code>{previewPath}/data.json</code></div>
          <div>📁 <code>{previewPath}/Dokumente/&lt;kategorie&gt;/</code></div>
        </div>
        <button className="btn-primary" onClick={handleSavePath} style={{ alignSelf: "flex-start", minWidth: 180 }}>
          {savedPath ? "✓ Gespeichert" : "Pfad speichern"}
        </button>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>🤖 Claude API-Key (KI-Erkennung)</div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            Benötigt für automatische Dokumentenerkennung. Key unter <code style={{ fontSize: 11, background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>console.anthropic.com</code> erstellen.
          </div>
        </div>
        <div>
          <label>API-Key</label>
          <input type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..." autoComplete="off" />
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          ⚠️ Wird nur lokal in diesem Browser gespeichert (localStorage).
        </div>
        <button className="btn-primary" onClick={handleSaveKey} style={{ alignSelf: "flex-start", minWidth: 180 }}>
          {savedKey ? "✓ Gespeichert" : "Key speichern"}
        </button>
      </div>

      <div className="card" style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>ℹ️ Hinweis</div>
        <p>Pfadänderungen verschieben bestehende Daten nicht automatisch — bitte manuell in OneDrive kopieren.</p>
      </div>
    </div>
  );
}
