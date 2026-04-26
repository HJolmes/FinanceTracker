import React, { useState, useEffect, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./services/authConfig";
import { loadData, saveData, forceReloadData } from "./services/oneDriveService";
import { loadSettings } from "./services/settingsService";
import { checkFaelligkeiten } from "./services/notificationService";
import { APP_VERSION } from "./version";

import NavBar from "./components/NavBar";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import EntryList from "./components/EntryList";
import AddEntry from "./components/AddEntry";
import Cashflow from "./components/Cashflow";
import TaxReceipts from "./components/TaxReceipts";
import Kalender from "./components/Kalender";
import Suche from "./components/Suche";
import Settings from "./components/Settings";
import WhatsNew from "./components/WhatsNew";

const SEEN_KEY = "financetracker_seen_version";

function getToken(instance, accounts) {
  return instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] })
    .then((r) => r.accessToken)
    .catch(() =>
      instance.acquireTokenPopup(loginRequest).then((r) => r.accessToken)
    );
}

function snapshotVermoegenIfNeeded(data) {
  const today = new Date().toISOString().slice(0, 7);
  const verlauf = data.vermoegensVerlauf || [];
  if (verlauf.length > 0 && verlauf[verlauf.length - 1].datum.startsWith(today)) return data;

  const bankGuthaben = (data.bankkonten || []).reduce((s, e) => s + (parseFloat(e.kontostand) || 0), 0);
  const depotwert = (data.sparplaene || []).reduce((s, e) => s + (parseFloat(e.depotwert) || 0), 0);
  const rueckkauf = (data.versicherungen || []).reduce((s, e) => s + (parseFloat(e.rueckkaufswert) || 0), 0);
  const wert = bankGuthaben + depotwert + rueckkauf;

  return {
    ...data,
    vermoegensVerlauf: [...verlauf, { datum: new Date().toISOString().slice(0, 10), wert }],
  };
}

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState("");
  const [editEntry, setEditEntry] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [faelligkeitenWarnungen, setFaelligkeitenWarnungen] = useState([]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    window.addEventListener("sw-updated", () => setUpdateReady(true));
  }, []);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !accounts.length) return;
    setLoading(true);
    try {
      const token = await getToken(instance, accounts);
      const raw = await loadData(token);
      const withSnapshot = snapshotVermoegenIfNeeded(raw);
      setData(withSnapshot);
      setFaelligkeitenWarnungen(checkFaelligkeiten(withSnapshot));
      if (withSnapshot !== raw) {
        await saveData(token, withSnapshot);
      }
    } catch (e) {
      console.error("loadData failed", e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accounts, instance]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen !== APP_VERSION) {
        setShowWhatsNew(true);
        localStorage.setItem(SEEN_KEY, APP_VERSION);
      }
    }
  }, [isAuthenticated, fetchData]);

  async function persist(newData) {
    setData(newData);
    setSyncing(true);
    try {
      const token = await getToken(instance, accounts);
      await saveData(token, newData);
    } catch (e) {
      console.error("saveData failed", e);
    } finally {
      setSyncing(false);
    }
  }

  function handleSaveEntry(category, entry) {
    const list = data[category] || [];
    const idx = list.findIndex((e) => e.id === entry.id);
    const newList = idx >= 0 ? list.map((e) => e.id === entry.id ? entry : e) : [...list, entry];
    persist({ ...data, [category]: newList });
    setShowAdd(false);
    setEditEntry(null);
  }

  function handleDeleteEntry(category, id) {
    const newList = (data[category] || []).filter((e) => e.id !== id);
    persist({ ...data, [category]: newList });
  }

  function handleTasksChange(category, entryId, tasks) {
    const newList = (data[category] || []).map((e) =>
      e.id === entryId ? { ...e, aufgaben: tasks } : e
    );
    persist({ ...data, [category]: newList });
  }

  function openAdd(category) {
    setAddCategory(category || "");
    setEditEntry(null);
    setShowAdd(true);
  }

  function openEdit(entry, category) {
    setEditEntry(entry);
    setAddCategory(category);
    setShowAdd(true);
  }

  async function handleForceReload() {
    const token = await getToken(instance, accounts);
    const fresh = await forceReloadData(token);
    setData(fresh);
    setFaelligkeitenWarnungen(checkFaelligkeiten(fresh));
  }

  function handleDataMerge(category, newEntries) {
    const merged = [...(data[category] || []), ...newEntries];
    persist({ ...data, [category]: merged });
  }

  function handleLogout() {
    instance.logoutPopup();
  }

  if (!isAuthenticated) return <LoginScreen />;
  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: "var(--accent)", fontSize: 18 }}>
        Lade Daten…
      </div>
    );
  }

  const settings = loadSettings();

  function renderContent() {
    if (showSettings) {
      return (
        <Settings
          data={data}
          onForceReload={handleForceReload}
          onDataMerge={handleDataMerge}
          onShowWhatsNew={() => setShowWhatsNew(true)}
        />
      );
    }
    switch (activeTab) {
      case "dashboard":
        return <Dashboard data={data} onAddEntry={openAdd} onTabChange={setActiveTab} faelligkeitenWarnungen={faelligkeitenWarnungen} geburtsjahr={settings.geburtsjahr} />;
      case "cashflow":
        return <Cashflow data={data} onAddEntry={openAdd} onEditEntry={(e) => openEdit(e, "einnahmen")} />;
      case "versicherungen":
      case "sparplaene":
      case "leasing":
      case "bankkonten":
        return (
          <EntryList
            category={activeTab}
            entries={data[activeTab] || []}
            onEdit={(e) => openEdit(e, activeTab)}
            onDelete={(id) => handleDeleteEntry(activeTab, id)}
            onTasksChange={(id, tasks) => handleTasksChange(activeTab, id, tasks)}
          />
        );
      case "steuerbelege":
        return (
          <TaxReceipts
            data={data}
            onEdit={(e) => openEdit(e, "steuerbelege")}
            onDelete={(id) => handleDeleteEntry("steuerbelege", id)}
          />
        );
      case "kalender":
        return <Kalender data={data} onEditEntry={(e, cat) => openEdit(e, cat)} />;
      case "suche":
        return <Suche data={data} onEditEntry={(e, cat) => openEdit(e, cat)} />;
      default:
        return null;
    }
  }

  const pageTitle = showSettings ? "⚙️ Einstellungen"
    : activeTab === "dashboard" ? "🏠 Dashboard"
    : activeTab === "cashflow" ? "💶 Cashflow"
    : activeTab === "versicherungen" ? "🛡️ Versicherungen"
    : activeTab === "sparplaene" ? "📈 Sparpläne"
    : activeTab === "leasing" ? "🚗 Leasing & Kredite"
    : activeTab === "bankkonten" ? "🏦 Bankkonten"
    : activeTab === "steuerbelege" ? "🧾 Steuerbelege"
    : activeTab === "kalender" ? "📅 Fälligkeiten"
    : activeTab === "suche" ? "🔍 Suche"
    : "";

  const showFab = !showSettings && ["versicherungen", "sparplaene", "leasing", "bankkonten", "steuerbelege", "cashflow", "dashboard"].includes(activeTab);

  return (
    <div className="app-layout">
      {updateReady && (
        <div className="update-banner">
          <span>Neue Version verfügbar</span>
          <button className="btn-ghost" style={{ color: "#0f1923", fontWeight: 700 }} onClick={() => window.location.reload()}>
            Jetzt aktualisieren
          </button>
        </div>
      )}

      <NavBar
        activeTab={showSettings ? "__settings" : activeTab}
        setActiveTab={(tab) => { setShowSettings(false); setActiveTab(tab); }}
        onSettings={() => setShowSettings((s) => !s)}
        onLogout={handleLogout}
        isDesktop={isDesktop}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!isDesktop && (
          <div className="mobile-header">
            <span style={{ fontWeight: 700, fontSize: 16 }}>{pageTitle}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {syncing && <span style={{ color: "var(--accent)", fontSize: 12 }}>☁️ sync…</span>}
              <button className="btn-ghost" style={{ padding: "6px" }} onClick={() => setShowSettings((s) => !s)}>⚙️</button>
            </div>
          </div>
        )}

        {isDesktop && (
          <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{pageTitle}</h2>
            {syncing && <span style={{ color: "var(--accent)", fontSize: 13 }}>☁️ Synchronisiere…</span>}
          </div>
        )}

        <div className="main-content">
          {renderContent()}
        </div>
      </div>

      {showFab && !isDesktop && (
        <button className="fab" onClick={() => openAdd(activeTab === "cashflow" ? "einnahmen" : activeTab === "dashboard" ? "" : activeTab)}>
          +
        </button>
      )}

      {isDesktop && showFab && (
        <button
          className="fab"
          style={{ bottom: 24 }}
          onClick={() => openAdd(activeTab === "cashflow" ? "einnahmen" : activeTab === "dashboard" ? "" : activeTab)}
        >
          +
        </button>
      )}

      {showAdd && (
        <AddEntry
          category={addCategory}
          editEntry={editEntry}
          data={data}
          getToken={accounts.length ? () => getToken(instance, accounts) : null}
          onSave={handleSaveEntry}
          onClose={() => { setShowAdd(false); setEditEntry(null); }}
        />
      )}

      {showWhatsNew && <WhatsNew onClose={() => setShowWhatsNew(false)} />}
    </div>
  );
}
