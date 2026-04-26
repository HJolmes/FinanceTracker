import React, { useState } from "react";
import ETFChart from "./ETFChart";

function DocViewer({ url, onClose }) {
  const isImage = /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url);
  return (
    <div className="modal-overlay center" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 720, width: "95%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px" }}>
          <button className="btn-ghost" onClick={onClose}>✕ Schließen</button>
        </div>
        {isImage
          ? <img src={url} alt="Dokument" style={{ width: "100%", display: "block" }} />
          : <iframe src={url} title="Dokument" style={{ width: "100%", height: "70vh", border: "none" }} />}
      </div>
    </div>
  );
}

function TaskList({ tasks, onChange }) {
  const [newText, setNewText] = useState("");

  function toggle(id) {
    onChange(tasks.map((t) => t.id === id ? { ...t, erledigt: !t.erledigt } : t));
  }

  function add() {
    if (!newText.trim()) return;
    onChange([...tasks, { id: Date.now().toString(), text: newText.trim(), erledigt: false }]);
    setNewText("");
  }

  function remove(id) {
    onChange(tasks.filter((t) => t.id !== id));
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--text2)" }}>Aufgaben</div>
      {tasks.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <input type="checkbox" checked={t.erledigt} onChange={() => toggle(t.id)} style={{ width: "auto", accentColor: "var(--accent)" }} />
          <span style={{ flex: 1, textDecoration: t.erledigt ? "line-through" : "none", color: t.erledigt ? "var(--text3)" : "var(--text)", fontSize: 14 }}>
            {t.text}
          </span>
          <button className="btn-ghost" style={{ padding: "2px 6px", color: "var(--red)" }} onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          placeholder="Neue Aufgabe…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ flex: 1 }}
        />
        <button className="btn-secondary" style={{ flexShrink: 0 }} onClick={add}>+</button>
      </div>
    </div>
  );
}

const CATEGORY_LABELS = {
  versicherungen: "Versicherungen",
  sparplaene: "Sparpläne",
  leasing: "Leasing & Kredite",
  bankkonten: "Bankkonten",
  steuerbelege: "Steuerbelege",
  einnahmen: "Einnahmen",
  ausgaben: "Ausgaben",
};

const KUENDIGUNG_CATS = new Set(["versicherungen", "leasing", "ausgaben"]);

function mainValue(entry, category) {
  if (category === "bankkonten") return entry.kontostand;
  if (category === "leasing") return entry.rate;
  if (category === "steuerbelege") return entry.betrag;
  if (category === "einnahmen") return entry.betrag;
  return entry.beitrag;
}

function fmt(n) {
  if (n == null || n === "") return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(n) || 0);
}

function EntryCard({ entry, category, onEdit, onDelete, onTasksChange, onKuendigen }) {
  const [expanded, setExpanded] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const tasks = entry.aufgaben || [];
  const openTasks = tasks.filter((t) => !t.erledigt).length;
  const val = mainValue(entry, category);
  const docs = [entry.dokument, ...(entry.dokumente || [])].filter(Boolean);

  const excludeKeys = new Set(["id", "aufgaben", "dokument", "dokumente"]);
  const fields = Object.entries(entry).filter(([k, v]) => !excludeKeys.has(k) && v !== "" && v != null);

  return (
    <>
      {viewDoc && <DocViewer url={viewDoc} onClose={() => setViewDoc(null)} />}
      <div className="card" style={{ marginBottom: 10 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => setExpanded(!expanded)}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              {entry.name || entry.beschreibung || "–"}
              {openTasks > 0 && <span className="badge">{openTasks}</span>}
              {entry.kuendigungswecker && entry.kuendigungsfrist && (() => {
                const days = Math.floor((new Date(entry.kuendigungsfrist) - new Date()) / 86400000);
                const color = days <= 7 ? "var(--red)" : days <= 30 ? "var(--accent)" : "var(--text3)";
                return <span style={{ fontSize: 11, color, fontWeight: 600, marginLeft: 4 }}>🔔 {days}T</span>;
              })()}
            </div>
            <div style={{ color: "var(--text2)", fontSize: 13 }}>
              {entry.typ || entry.kategorie || ""}{val ? ` · ${fmt(val)}` : ""}
              {entry.intervall ? ` · ${entry.intervall}` : ""}
            </div>
          </div>
          <span style={{ color: "var(--text3)" }}>{expanded ? "▲" : "▼"}</span>
        </div>

        {expanded && (
          <div style={{ marginTop: 12 }}>
            <div className="divider" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 13 }}>
              {fields.map(([k, v]) => (
                <React.Fragment key={k}>
                  <span style={{ color: "var(--text3)" }}>{k}</span>
                  <span style={{ color: "var(--text)" }}>{String(v)}</span>
                </React.Fragment>
              ))}
            </div>

            {docs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>Dokumente</div>
                {docs.map((url, i) => (
                  <button key={i} className="btn-ghost" style={{ fontSize: 13, display: "block", marginBottom: 4 }} onClick={() => setViewDoc(url)}>
                    📄 Dokument {i + 1} öffnen
                  </button>
                ))}
              </div>
            )}

            {(category === "sparplaene") && (entry.ticker || entry.isin) && (
              <div style={{ marginTop: 12 }}>
                <ETFChart ticker={entry.ticker} isin={entry.isin} name={entry.name} anteile={entry.anteile} />
              </div>
            )}

            <TaskList tasks={tasks} onChange={(t) => onTasksChange(entry.id, t)} />

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onEdit(entry)}>✏️ Bearbeiten</button>
              {KUENDIGUNG_CATS.has(category) && onKuendigen && (
                <button className="btn-danger" style={{ flex: 1 }} onClick={() => onKuendigen(entry)}>🔴 Kündigen</button>
              )}
              {confirmDel
                ? <>
                    <button className="btn-danger" style={{ flex: 1 }} onClick={() => onDelete(entry.id)}>Wirklich löschen?</button>
                    <button className="btn-ghost" onClick={() => setConfirmDel(false)}>Abbrechen</button>
                  </>
                : <button className="btn-danger" style={{ flex: 1 }} onClick={() => setConfirmDel(true)}>🗑️ Löschen</button>
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function EntryList({ category, entries, onEdit, onDelete, onTasksChange, onKuendigen }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ color: "var(--text3)", textAlign: "center", padding: "40px 20px" }}>
        Noch keine Einträge in {CATEGORY_LABELS[category] || category}.
      </div>
    );
  }

  return (
    <div>
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          onTasksChange={onTasksChange}
          onKuendigen={onKuendigen}
        />
      ))}
    </div>
  );
}
