import React, { useState } from "react";
import { getSettings, saveSettings, getFolderPath } from "../services/settingsService";
import { getClaudeApiKey, saveClaudeApiKey } from "../services/claudeService";
import { APP_VERSION, APP_CHANGELOG } from "../version";
import BankingConnect from "./BankingConnect";

async function forceAppUpdate() {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) await reg.unregister();
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    for (const key of keys) await caches.delete(key);
  }
  window.location.reload(true);
}

export default function Settings({ onShowWhatsNew, onReloadData }) {
  const [settings, setSettings] = useState(getSettings());
  const [claudeKey, setClaudeKey] = useState(getClaudeApiKey());
  const [savedPath, setSavedPath] = useState(false);
  const [savedKey, setSavedKey] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState(false);
  const [savedBanking, setSavedBanking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [reloading, setReloading] = useState(false);

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

  const handleSaveBanking = () => {
    saveSettings({ ...settings, bankingFunctionUrl: settings.bankingFunctionUrl?.trim() || "" });
    setSavedBanking(true);
    setTimeout(() => setSavedBanking(false), 2500);
  };

  const handleForceUpdate = async () => {
    setUpdating(true);
    await forceAppUpdate();
  };

  const handleReload = async () => {
    setReloading(true);
    await onReloadData?.();
    setReloading(false);
  };

  const previewPath = settings.oneDriveFolderPath || "…";
  const effectivePath = getFolderPath();
  const currentYear = new Date().getFullYear();
  const geburtsjahr = parseInt(settings.geburtsjahr);
  const alter = !isNaN(geburtsjahr) && geburtsjahr > 1900 ? currentYear - geburtsjahr : null;
  const jahreZu67 = alter !== null ? Math.max(0, 67 - alter) : null;
  const changelog = APP_CHANGELOG[APP_VERSION];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 4 }}>Einstellungen</div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>App-Konfiguration</div>
      </div>

      {/* App-Update */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>🔍 Letzte Aktualisierung</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {APP_VERSION}{changelog ? ` · ${changelog.date}` : ""}
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: 12, padding: "8px 16px", flexShrink: 0, whiteSpace: "nowrap" }}
            onClick={onShowWhatsNew}>Was ist neu?</button>
        </div>
        <button className="btn-primary"
          style={{ fontSize: 13, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={handleForceUpdate} disabled={updating}>
          {updating ? <>⏳ Wird aktualisiert…</> : <>🔄 App aktualisieren &amp; neu laden</>}
        </button>
        <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
          Löscht den lokalen Cache und lädt die neueste Version. OneDrive-Daten bleiben erhalten.
        </div>
      </div>

      {/* OneDrive */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>☁️ OneDrive-Speicherpfad</div>

        {/* Active path indicator */}
        <div style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
          <span style={{ color: "var(--text3)" }}>Aktiver Pfad: </span>
          <code style={{ color: "var(--accent)", fontWeight: 600 }}>{effectivePath}/data.json</code>
        </div>

        <div>
          <label>Pfad ändern (relativ zur OneDrive-Wurzel)</label>
          <input type="text" value={settings.oneDriveFolderPath}
            onChange={(e) => setSettings((p) => ({ ...p, oneDriveFolderPath: e.target.value.replace(/^\/+|\/+$/g, "") }))}
            placeholder="z.B. Desktop/Privat/Finanzen" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" onClick={handleSavePath} style={{ flex: 1 }}>
            {savedPath ? "✓ Gespeichert" : "Pfad speichern"}
          </button>
          <button className="btn-secondary" onClick={handleReload} style={{ flex: 1 }} disabled={reloading}>
            {reloading ? "⏳ Lädt…" : "☁️ Aus OneDrive laden"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
          Nach Pfad-Änderung: Pfad speichern → dann „Aus OneDrive laden“ klicken.
        </div>

        <div style={{ background: "rgba(74,158,255,0.08)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", marginBottom: 6 }}>📱 Geräteübergreifende Synchronisierung</div>
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
            Alle Daten werden in deiner OneDrive gespeichert. Auf jedem Gerät mit demselben Microsoft-Konto
            und demselben Pfad sind deine Finanzdaten automatisch verfügbar.
          </div>
        </div>
      </div>

      {/* Persönliche Daten */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>👤 Persönliche Daten</div>
        <div>
          <label>Geburtsjahr</label>
          <input type="number" value={settings.geburtsjahr || ""}
            onChange={(e) => setSettings((p) => ({ ...p, geburtsjahr: e.target.value }))}
            placeholder="z.B. 1990" min="1900" max={currentYear} />
        </div>
        {alter !== null && (
          <div style={{ background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 12, color: "var(--text3)", lineHeight: 1.8 }}>
            <div>Aktuelles Alter: <span style={{ color: "var(--text)", fontWeight: 600 }}>{alter} Jahre</span></div>
            {jahreZu67 > 0
              ? <div>Jahre bis Rente (67): <span style={{ color: "var(--accent)", fontWeight: 600 }}>{jahreZu67} Jahre</span></div>
              : <div style={{ color: "var(--green)", fontWeight: 600 }}>Rentenalter bereits erreicht</div>}
          </div>
        )}
        <button className="btn-primary" onClick={handleSavePersonal} style={{ alignSelf: "flex-start", minWidth: 180 }}>
          {savedPersonal ? "✓ Gespeichert" : "Speichern"}
        </button>
      </div>

      {/* Banking */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🏦 Live-Bankdaten (GoCardless)</div>
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
            Verbindet echte Bankkonten über Open Banking (PSD2). Kontostand wird live abgerufen.
          </div>
        </div>
        <BankingConnect />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text2)" }}>Azure Function URL</div>
          <input type="text" value={settings.bankingFunctionUrl || ""}
            onChange={(e) => setSettings((p) => ({ ...p, bankingFunctionUrl: e.target.value }))}
            placeholder="https://deine-app.azurewebsites.net" />
          <button className="btn-primary" onClick={handleSaveBanking} style={{ alignSelf: "flex-start", minWidth: 180, marginTop: 10 }}>
            {savedBanking ? "✓ Gespeichert" : "URL speichern"}
          </button>
        </div>
      </div>

      {/* Claude API */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>🤖 Claude API-Key (KI-Erkennung)</div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            Benötigt für automatische Dokumentenerkennung. Key unter{" "}
            <code style={{ fontSize: 11, background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>console.anthropic.com</code> erstellen.
          </div>
        </div>
        <div>
          <label>API-Key</label>
          <input type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..." autoComplete="off" />
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          ⚠️ Wird nur lokal im Browser gespeichert (localStorage). Auf anderen Geräten bitte erneut eingeben.
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
