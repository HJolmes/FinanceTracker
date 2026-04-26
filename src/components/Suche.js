import React, { useState } from "react";
import { search } from "../services/searchService";

const CATEGORY_LABELS = {
  versicherungen: "Versicherungen 🛡️",
  sparplaene: "Sparpläne 📈",
  leasing: "Leasing 🚗",
  bankkonten: "Bankkonten 🏦",
  steuerbelege: "Steuerbelege 🧾",
  einnahmen: "Einnahmen 💰",
};

function highlight(text, query) {
  if (!text || !query) return String(text || "");
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return String(text);
  const s = String(text);
  return (
    <>
      {s.slice(0, idx)}
      <mark style={{ background: "rgba(232,168,56,0.35)", color: "var(--text)", borderRadius: 2 }}>
        {s.slice(idx, idx + query.length)}
      </mark>
      {s.slice(idx + query.length)}
    </>
  );
}

export default function Suche({ data, onEditEntry }) {
  const [query, setQuery] = useState("");
  const results = query.length >= 2 ? search(query, data) : [];

  const grouped = {};
  for (const r of results) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input
        autoFocus
        placeholder="Suche… (mind. 2 Zeichen)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ fontSize: 16, padding: "12px 14px" }}
      />

      {query.length >= 2 && results.length === 0 && (
        <div style={{ color: "var(--text3)", textAlign: "center", padding: "24px" }}>
          Keine Ergebnisse für «{query}»
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
            {CATEGORY_LABELS[cat] || cat}
          </div>
          {items.map((r, i) => (
            <div key={i} className="card" style={{ marginBottom: 8, cursor: "pointer" }}
              onClick={() => onEditEntry(r.entry, r.category)}>
              <div style={{ fontWeight: 500 }}>{r.entry.name || r.entry.beschreibung || "–"}</div>
              <div style={{ color: "var(--text3)", fontSize: 13 }}>
                {r.matchedField}: {highlight(r.entry[r.matchedField], query)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
