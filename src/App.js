// src/App.js
import React, { useState, useEffect } from "react";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./services/authConfig";
import { loadData, saveData } from "./services/oneDriveService";
import Dashboard from "./components/Dashboard";
import EntryList from "./components/EntryList";
import AddEntry from "./components/AddEntry";
import LoginScreen from "./components/LoginScreen";
import NavBar from "./components/NavBar";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

function AppInner() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(instance, accounts).then((d) => {
        setData(d);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleSave = async (newData) => {
    setData(newData);
    setSyncing(true);
    await saveData(instance, accounts, newData);
    setSyncing(false);
  };

  const handleAddEntry = async (category, entry) => {
    const newData = {
      ...data,
      [category]: [...(data[category] || []), { ...entry, id: Date.now().toString() }],
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

  const handleLogin = () => instance.loginPopup(loginRequest);

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;
  if (loading || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text2)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>Lade Daten aus OneDrive…</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 8px", borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Finance<span style={{ color: "var(--accent)" }}>Tracker</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
              {syncing ? "⟳ Synchronisiert…" : "✓ OneDrive sync"}
            </div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => instance.logout()}>Abmelden</button>
        </div>
      </div>

      {/* Content */}
      <div className="scroll" style={{ flex: 1, padding: "16px 20px" }}>
        {activeTab === "dashboard" && <Dashboard data={data} />}
        {activeTab !== "dashboard" && (
          <EntryList
            category={activeTab}
            entries={data[activeTab] || []}
            onDelete={(id) => handleDeleteEntry(activeTab, id)}
            onEdit={(entry) => setEditEntry(entry)}
            instance={instance}
            accounts={accounts}
          />
        )}
      </div>

      {/* FAB Add Button */}
      {activeTab !== "dashboard" && (
        <button
          className="btn-primary"
          onClick={() => setShowAdd(true)}
          style={{
            position: "fixed", bottom: 90, right: 20,
            borderRadius: "50%", width: 56, height: 56,
            fontSize: 24, padding: 0, boxShadow: "0 4px 20px rgba(232,168,56,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
      )}

      {/* NavBar */}
      <NavBar active={activeTab} onChange={setActiveTab} />

      {/* Add / Edit Modal */}
      {(showAdd || editEntry) && (
        <AddEntry
          category={activeTab}
          entry={editEntry}
          onSave={(entry) =>
            editEntry
              ? handleUpdateEntry(activeTab, editEntry.id, entry)
              : handleAddEntry(activeTab, entry)
          }
          onClose={() => { setShowAdd(false); setEditEntry(null); }}
          instance={instance}
          accounts={accounts}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AppInner />
    </MsalProvider>
  );
}
