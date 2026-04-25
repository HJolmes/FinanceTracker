import React, { useState, useEffect } from "react";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./services/authConfig";
import { loadData, saveData, uploadDocument, forceReloadData } from "./services/oneDriveService";
import { detectDocumentType, buildDocumentName } from "./services/claudeService";
import { getRequisition, saveConnectedAccount, getPendingRequisition, clearPendingRequisition } from "./services/bankingService";
import Dashboard from "./components/Dashboard";
import EntryList from "./components/EntryList";
import TaxReceipts from "./components/TaxReceipts";
import AddEntry from "./components/AddEntry";
import AddReceipt from "./components/AddReceipt";
import LoginScreen from "./components/LoginScreen";
import NavBar from "./components/NavBar";
import Settings from "./components/Settings";
import WhatsNew from "./components/WhatsNew";
import { APP_VERSION } from "./version";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

function useIsDesktop() {
  const [d, setD] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const h = (e) => setD(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return d;
}

function UpdateBanner() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
      background: "var(--accent)", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px", fontSize: 13, boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    }}>
      <span>🔄 Neue Version verfügbar</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "rgba(255,255,255,0.25)", border: "none",
          borderRadius: 8, padding: "6px 16px", color: "#fff",
          cursor: "pointer", fontWeight: 700, fontSize: 13,
        }}
      >
        Jetzt aktualisieren
      </button>
    </div>
  );
}

function AppInner() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [smartEntry, setSmartEntry] = useState(null);
  const [nordigenNotice, setNordigenNotice] = useState("");
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateReady(true);
    window.addEventListener("sw-updated", handler);
    return () => window.removeEventListener("sw-updated", handler);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(instance, accounts).then((d) => {
        setData(d);
        setLoading(false);
        const seen = localStorage.getItem("ft_seen_version");
        if (seen !== APP_VERSION) {
          setShowWhatsNew(true);
          localStorage.setItem("ft_seen_version", APP_VERSION);
        }
      });
      const pendingId = getPendingRequisition();
      if (pendingId) {
        clearPendingRequisition();
        getRequisition(pendingId)
          .then((req) => {
            saveConnectedAccount({
              requisitionId: pendingId, institutionId: req.institution_id,
              institutionName: req.institution_id, status: req.status,
              accountIds: req.accounts || [], createdAt: new Date().toISOString(),
            });
            setNordigenNotice("✅ Bankkonto erfolgreich verbunden!");
            setActiveTab("settings");
            setTimeout(() => setNordigenNotice(""), 5000);
          })
          .catch(() => {
            setNordigenNotice("❌ Bankverbindung fehlgeschlagen – bitte erneut versuchen.");
            setActiveTab("settings");
            setTimeout(() => setNordigenNotice(""), 5000);
          });
      }
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]); // eslint-disable-line

  const handleSave = async (newData) => {
    setData(newData);
    setSyncing(true);
    await saveData(instance, accounts, newData);
    setSyncing(false);
  };

  const handleReloadFromOneDrive = async () => {
    setLoading(true);
    try {
      const { data: newData } = await forceReloadData(instance, accounts);
      setData(newData);
    } catch (e) {
      alert(`❌ OneDrive-Laden fehlgeschlagen:\n${e.message}\n\nBitte Pfad in Einstellungen prüfen.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (category, entry) => {
    const newData = {
      ...data,
      [category]: [...(data[category] || []), { ...entry, id: entry.id || Date.now().toString() }],
      lastUpdated: new Date().toISOString(),
    };
    await handleSave(newData);
    setShowAdd(false);
  };

  const handleUpdateEntry = async (category, id, entry) => {
    const newData = {
      ...data,
      [category]: data[category].map((e) => (e.id === id ? { ...entry, id } : e)),
      lastUpdated: new Date().toISOString(),
    };
    await handleSave(newData);
    setEditEntry(null);
  };

  const handleDeleteEntry = async (category, id) => {
    const newData = {
      ...data,
      [category]: data[category].filter((e) => e.id !== id),
      lastUpdated: new Date().toISOString(),
    };
    await handleSave(newData);
  };

  const handleDeleteDocument = async (category, entryId, docIndex) => {
    const entry = (data[category] || []).find((e) => e.id === entryId);
    if (!entry) return;
    const newDokumente = (entry.dokumente || []).filter((_, i) => i !== docIndex);
    const updatedEntry = { ...entry, dokumente: newDokumente, dokument: newDokumente[0]?.url || "" };
    const newData = {
      ...data,
      [category]: data[category].map((e) => (e.id === entryId ? updatedEntry : e)),
      lastUpdated: new Date().toISOString(),
    };
    await handleSave(newData);
  };

  const handleAddDocumentToEntry = async (category, entryId, extractedFields, file) => {
    const entry = (data[category] || []).find((e) => e.id === entryId);
    if (!entry) return;
    try {
      const typ = await detectDocumentType(file);
      const anbieter = entry.anbieter || entry.bank || "";
      const subfolder = entry.polizzennummer || entry.isin || entryId;
      const name = buildDocumentName(typ, anbieter);
      const url = await uploadDocument(instance, accounts, file, category, entryId, { customName: name, subfolder });
      const newDoc = { url, name, typ, datum: new Date().toISOString().slice(0, 10) };
      const { category: _cat, ...fields } = extractedFields;
      const updatedEntry = {
        ...entry, ...fields, dokument: url,
        dokumente: [newDoc, ...(entry.dokumente || [])],
      };
      await handleUpdateEntry(category, entryId, updatedEntry);
    } catch (e) {
      console.warn("Dokument-Upload fehlgeschlagen", e);
    }
  };

  const handleNavChange = (tab) => { setActiveTab(tab); setShowAdd(false); setEditEntry(null); };
  const handleSmartUpload = (category, fields, file) => setSmartEntry({ category, data: fields, file });

  if (!isAuthenticated) return <LoginScreen onLogin={() => instance.loginPopup(loginRequest)} />;
  if (loading || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text2)" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div><div>Lade Daten aus OneDrive…</div></div>
    </div>
  );

  const isSettings = activeTab === "settings";
  const isTax = activeTab === "steuerbelege";
  const showFab = !isSettings && activeTab !== "dashboard";

  const mainContent = (
    <>
      {isSettings && (
        <Settings
          onShowWhatsNew={() => setShowWhatsNew(true)}
          onReloadData={handleReloadFromOneDrive}
        />
      )}
      {!isSettings && activeTab === "dashboard" && (
        <Dashboard data={data} onSmartUpload={handleSmartUpload} onAddDocument={handleAddDocumentToEntry} />
      )}
      {!isSettings && isTax && (
        <TaxReceipts receipts={data.steuerbelege || []}
          onDelete={(id) => handleDeleteEntry("steuerbelege", id)}
          onEdit={(entry) => setEditEntry(entry)} />
      )}
      {!isSettings && !isTax && activeTab !== "dashboard" && (
        <EntryList
          category={activeTab}
          entries={data[activeTab] || []}
          onDelete={(id) => handleDeleteEntry(activeTab, id)}
          onEdit={(entry) => setEditEntry(entry)}
          onDeleteDocument={(entryId, docIndex) => handleDeleteDocument(activeTab, entryId, docIndex)}
          instance={instance} accounts={accounts}
        />
      )}
    </>
  );

  const modals = (
    <>
      {isTax && showAdd && <AddReceipt onSave={(entry) => handleAddEntry("steuerbelege", entry)} onClose={() => setShowAdd(false)} instance={instance} accounts={accounts} />}
      {isTax && editEntry && <AddReceipt receipt={editEntry} onSave={(entry) => handleUpdateEntry("steuerbelege", editEntry.id, entry)} onClose={() => setEditEntry(null)} instance={instance} accounts={accounts} />}
      {!isTax && (showAdd || editEntry) && !smartEntry && (
        <AddEntry category={activeTab} entry={editEntry}
          onSave={(entry) => editEntry ? handleUpdateEntry(activeTab, editEntry.id, entry) : handleAddEntry(activeTab, entry)}
          onClose={() => { setShowAdd(false); setEditEntry(null); }}
          instance={instance} accounts={accounts} />
      )}
      {smartEntry && (
        <AddEntry category={smartEntry.category} entry={smartEntry.data} pendingFile={smartEntry.file}
          onSave={(entry) => { handleAddEntry(smartEntry.category, entry); setSmartEntry(null); }}
          onClose={() => setSmartEntry(null)}
          instance={instance} accounts={accounts} />
      )}
      {showWhatsNew && <WhatsNew onClose={() => setShowWhatsNew(false)} />}
    </>
  );

  const fab = showFab && (
    <button className="btn-primary" onClick={() => setShowAdd(true)}
      style={{ position: "fixed", bottom: isDesktop ? 32 : 90, right: isDesktop ? 32 : 20, borderRadius: "50%", width: 56, height: 56, fontSize: 24, padding: 0, boxShadow: "0 4px 20px rgba(232,168,56,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >+</button>
  );

  const notice = nordigenNotice && (
    <div style={{ padding: "10px 20px", background: nordigenNotice.startsWith("✅") ? "var(--green)" : "var(--red)", color: "#fff", fontSize: 13, textAlign: "center" }}>
      {nordigenNotice}
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ display: "flex", height: "100%" }}>
        {updateReady && <UpdateBanner />}
        <NavBar active={isSettings ? null : activeTab} onChange={handleNavChange} mode="sidebar"
          syncing={syncing} onSettings={() => handleNavChange("settings")} onLogout={() => instance.logout()} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {notice}
          <div className="scroll" style={{ flex: 1, padding: "24px 40px", paddingTop: updateReady ? 72 : 24 }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>{mainContent}</div>
          </div>
        </div>
        {fab}{modals}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 480, margin: "0 auto" }}>
      {updateReady && <UpdateBanner />}
      <div style={{ padding: "16px 20px 8px", borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0, marginTop: updateReady ? 48 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Finance<span style={{ color: "var(--accent)" }}>Tracker</span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400, marginLeft: 8, fontFamily: "var(--font-body)", letterSpacing: 0 }}>{APP_VERSION}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
              {syncing ? "⟳ Synchronisiert…" : "✓ OneDrive sync"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn-ghost" style={{ fontSize: 18, padding: "8px 10px", color: isSettings ? "var(--accent)" : undefined }}
              onClick={() => handleNavChange(isSettings ? "dashboard" : "settings")}>⚙️</button>
            <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => instance.logout()}>Abmelden</button>
          </div>
        </div>
      </div>
      {notice}
      <div className="scroll" style={{ flex: 1, padding: "16px 20px" }}>{mainContent}</div>
      {fab}
      <NavBar active={isSettings ? null : activeTab} onChange={handleNavChange} />
      {modals}
    </div>
  );
}

export default function App() {
  return <MsalProvider instance={msalInstance}><AppInner /></MsalProvider>;
}
