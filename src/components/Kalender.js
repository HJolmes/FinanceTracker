import React, { useState } from "react";

const ICONS = { versicherungen: "🛡️", leasing: "🚗", sparplaene: "📈" };

function getFaelligkeiten(data) {
  const items = [];
  const today = new Date();

  const addItems = (cat, entries, dateField) => {
    (entries || []).forEach((e) => {
      const dateStr = e[dateField];
      if (!dateStr) return;
      const due = new Date(dateStr);
      const diffDays = Math.floor((due - today) / 86400000);
      items.push({ entry: e, category: cat, dateStr, diffDays, due });
    });
  };

  addItems("versicherungen", data.versicherungen, "faelligkeit");
  addItems("leasing", data.leasing, "faelligkeit");
  addItems("sparplaene", data.sparplaene, "startdatum");

  return items.sort((a, b) => a.due - b.due);
}

export default function Kalender({ data, onEditEntry }) {
  const [filter, setFilter] = useState("all");
  const today = new Date();
  const thisYear = today.getFullYear();

  const all = getFaelligkeiten(data);
  const filtered = all.filter((item) => {
    if (filter === "this") return item.due.getFullYear() === thisYear;
    if (filter === "next") return item.due.getFullYear() === thisYear + 1;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[["all", "Alle"], ["this", "Dieses Jahr"], ["next", "Nächstes Jahr"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: "6px 14px", fontSize: 13, borderRadius: 6, background: filter === v ? "var(--accent)" : "var(--bg3)", color: filter === v ? "#0f1923" : "var(--text2)", border: "none", cursor: "pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ color: "var(--text3)", textAlign: "center", padding: "40px 20px" }}>
          Keine Fälligkeiten im gewählten Zeitraum.
        </div>
      )}

      {filtered.map((item, i) => {
        const color = item.diffDays < 30 ? "var(--red)" : item.diffDays < 90 ? "var(--accent)" : "var(--green)";
        return (
          <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 12 }}
            onClick={() => onEditEntry(item.entry, item.category)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{ICONS[item.category] || "📋"}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{item.entry.name}</div>
                <div style={{ color: "var(--text3)", fontSize: 12 }}>{item.category}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color, fontWeight: 600 }}>{item.dateStr}</div>
              <div style={{ fontSize: 12, color }}>
                {item.diffDays >= 0 ? `${item.diffDays} Tage` : `${Math.abs(item.diffDays)} Tage her`}
              </div>
              {item.diffDays >= 0 && item.diffDays <= 30 && (
                <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>⚠️ Kündigungsfrist prüfen</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
