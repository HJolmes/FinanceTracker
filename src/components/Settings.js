import React, { useState } from "react";
import { loadSettings, saveSettings } from "../services/settingsService";
import { importFromFile, isDuplicate } from "../services/importService";
import { APP_VERSION } from "../version";

export default function Settings({ data, onForceReload, onDataMerge, onShowWhatsNew }) {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadMsg, setReloadMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");

  function update(key, val) {
    const next = { ...settings, [key]: val };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleForceReload() {
    setReloading(true);
    setReloadMsg("");
    try {
      await onForceReload();
      setReloadMsg("✓ Daten aus OneDrive geladen.");
    } catch (e) {
      setReloadMsg(`Fehler: ${e.message}`);
    } finally {
      setReloading(false);
    }
  }

  async function handleImport(file) {
    setImportMsg("Wird verarbeitet…");
    try {
      const { category, entries } = await importFromFile(file);
      const existing = data[category] || [];
      const newEntries = entries.filter((e) => !isDuplicate(existing, e));
      const dupeCount = entries.length - newEntries.length;
      if (window.confirm(`${newEntries.length} Einträge importieren (${dupeCount} Duplikate übersprungen)?`)) {
        onDataMerge(category, newEntries);
        setImportMsg(`✓ ${newEntries.length} Einträge in ${category} importiert.`);
      } else {
        setImportMsg("Import abgebrochen.");
      }
    } catch (e) {
      setImportMsg(`Fehler: ${e.message}`);
    }
  }

  async function clearCacheAndReload() {
    if (!window.confirm("App-Cache löschen und neu laden?")) return;
    const regs = await navigator.serviceWorker?.getRegistrations() || [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    window.location.reload();
  }

  const alter = settings.geburtsjahr
    ? new Date().getFullYear() - parseInt(settings.geburtsjahr)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>☁️ OneDrive</div>
        <div className="form-group">
          <label className="form-label">Ordnerpfad (relativ zu OneDrive-Stamm)</label>
          <input value={settings.oneDriveFolderPath} onChange={(e) => update("oneDriveFolderPath", e.target.value)} />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>
            Aktiver Pfad: {settings.oneDriveFolderPath}/data.json
          </span>
        </div>
        <button className="btn-secondary" onClick={handleForceReload} disabled={reloading} style={{ marginTop: 4 }}>
          {reloading ? "Lädt…" : "☁️ Aus OneDrive laden"}
        </button>
        {reloadMsg && <div style={{ color: reloadMsg.startsWith("✓") ? "var(--green)" : "var(--red)", fontSize: 13, marginTop: 8 }}>{reloadMsg}</div>}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>👤 Persönlich</div>
        <div className="form-group">
          <label className="form-label">Geburtsjahr</label>
          <input type="number" min="1940" max="2010" value={settings.geburtsjahr} onChange={(e) => update("geburtsjahr", e.target.value)} placeholder="z.B. 1985" />
          {alter !== null && (
            <span style={{ color: "var(--accent)", fontSize: 13 }}>
              Alter: {alter} Jahre · Noch {Math.max(0, 67 - alter)} Jahre bis 67
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>🤖 Claude AI</div>
        <div className="form-group">
          <label className="form-label">API-Key (nur lokal gespeichert)</label>
          <input
            type="password"
            value={localStorage.getItem("financetracker_claude_key") || ""}
            onChange={(e) => localStorage.setItem("financetracker_claude_key", e.target.value)}
            placeholder="sk-ant-…"
          />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>Wird nicht in OneDrive synchronisiert.</span>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>📥 Import</div>
        <label className="form-label">CSV oder Excel importieren</label>
        <input type="file" accept=".csv,.xlsx" onChange={(e) => e.target.files[0] && handleImport(e.target.files[0])} style={{ marginTop: 8 }} />
        {importMsg && <div style={{ color: importMsg.startsWith("✓") ? "var(--green)" : importMsg.startsWith("Fehler") ? "var(--red)" : "var(--text2)", fontSize: 13, marginTop: 8 }}>{importMsg}</div>}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>ℹ️ App</div>
        <div style={{ color: "var(--text2)", fontSize: 14, marginBottom: 12 }}>Version: {APP_VERSION}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onShowWhatsNew}>🎉 Was ist neu?</button>
          <button className="btn-secondary" onClick={clearCacheAndReload}>🔄 App aktualisieren</button>
        </div>
        {saved && <div style={{ color: "var(--green)", fontSize: 13, marginTop: 8 }}>✓ Gespeichert</div>}
      </div>
    </div>
  );
}
