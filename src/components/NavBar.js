import React, { useState } from "react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "cashflow", label: "Cashflow", icon: "💶" },
  { id: "ausgaben", label: "Ausgaben", icon: "💸" },
  { id: "versicherungen", label: "Versicherungen", icon: "🛡️" },
  { id: "sparplaene", label: "Sparpläne", icon: "📈" },
  { id: "leasing", label: "Leasing", icon: "🚗" },
  { id: "bankkonten", label: "Bankkonten", icon: "🏦" },
  { id: "steuerbelege", label: "Steuerbelege", icon: "🧾" },
  { id: "kalender", label: "Fälligkeiten", icon: "📅" },
  { id: "suche", label: "Suche", icon: "🔍" },
];

export default function NavBar({ activeTab, setActiveTab, onSettings, onLogout, isDesktop }) {
  const [moreOpen, setMoreOpen] = useState(false);

  if (isDesktop) {
    return (
      <nav className="sidebar">
        <div className="sidebar-logo">💰 FinanceTracker</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`sidebar-nav-item${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <div className="sidebar-bottom">
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onSettings} title="Einstellungen">
            ⚙️
          </button>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onLogout} title="Abmelden">
            🚪
          </button>
        </div>
      </nav>
    );
  }

  const visibleTabs = TABS.slice(0, 4);
  const moreTabs = TABS.slice(4);
  const isMoreActive = moreTabs.some((t) => t.id === activeTab);

  function selectTab(tab) {
    setMoreOpen(false);
    setActiveTab(tab);
  }

  return (
    <>
      {moreOpen && (
        <div className="bottom-nav-more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="bottom-nav-more" onClick={(e) => e.stopPropagation()}>
            {moreTabs.map((t) => (
              <button
                key={t.id}
                className={`bottom-nav-more-item${activeTab === t.id ? " active" : ""}`}
                onClick={() => selectTab(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="bottom-nav">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`bottom-nav-item${activeTab === t.id ? " active" : ""}`}
            onClick={() => selectTab(t.id)}
          >
            <span className="icon">{t.icon}</span>
            <span>{t.label.split(" ")[0]}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item${isMoreActive || moreOpen ? " active" : ""}`}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span className="icon">⋯</span>
          <span>Mehr</span>
        </button>
      </nav>
    </>
  );
}
