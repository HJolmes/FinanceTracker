import React, { useState } from "react";

const CATEGORY_CONFIG = {
  versicherungen: {
    label: "Versicherungen", icon: "🛡️",
    fields: ["name","anbieter","typ","beitrag","intervall","faelligkeit","polizzennummer","notiz"],
    typen: ["Krankenversicherung","Haftpflicht","Kfz","Berufsunfähigkeit","Risikoleben","Hausrat","Gebäude","Rechtsschutz","Unfallversicherung","Reiseversicherung","Lebensversicherung","Rentenversicherung","Sonstige"],
  },
  sparplaene: {
    label: "Sparäne & ETF", icon: "📈",
    fields: ["name","anbieter","typ","beitrag","intervall","depot","isin","startdatum","notiz"],
    typen: ["ETF","Fonds","Aktienplan","Festgeld","Tagesgeld","Bausparvertrag","Sonstiges"],
  },
  leasing: {
    label: "Leasing & Kredite", icon: "🚗",
    fields: ["name","anbieter","typ","rate","intervall","laufzeit","restwert","faelligkeit","notiz"],
    typen: ["Kfz-Leasing","Immobilienkredit","Ratenkredit","Dispositionskredit","Sonstiges"],
  },
  bankkonten: {
    label: "Bankkonten", icon: "🏦",
    fields: ["name","bank","typ","iban","kontonummer","notiz"],
    typen: ["Girokonto","Tagesgeld","Festgeld","Depot","Gemeinschaftskonto","Sonstiges"],
  },
};

function getMainValue(category, entry) {
  if (category === "versicherungen" || category === "sparplaene") return entry.beitrag;
  if (category === "leasing") return entry.rate;
  return null;
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

function EntryCard({ category, entry, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const value = getMainValue(category, entry);

  return (
    <div className="card fade-in" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {CATEGORY_CONFIG[category].icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>{entry.name || "–"}</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{entry.anbieter || entry.bank || ""}{entry.typ ? ` · ${entry.typ}` : ""}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {value && (
            <>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--accent)" }}>
                {parseFloat(value).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{entry.intervall || "monatl."}</div>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {entry.polizzennummer && <InfoRow label="Policennr." value={entry.polizzennummer} />}
            {entry.isin && <InfoRow label="ISIN" value={entry.isin} />}
            {entry.depot && <InfoRow label="Depot" value={entry.depot} />}
            {entry.faelligkeit && <InfoRow label="Fälligkeit" value={entry.faelligkeit} />}
            {entry.laufzeit && <InfoRow label="Laufzeit" value={entry.laufzeit} />}
            {entry.restwert && <InfoRow label="Restwert" value={`${entry.restwert} €`} />}
            {entry.startdatum && <InfoRow label="Start" value={entry.startdatum} />}
            {entry.iban && <InfoRow label="IBAN" value={entry.iban} />}
            {entry.kontonummer && <InfoRow label="Kontonr." value={entry.kontonummer} />}
          </div>
          {entry.notiz && (
            <div style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
              📝 {entry.notiz}
            </div>
          )}
          {entry.dokument && (
            <a href={entry.dokument} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--blue)", textDecoration: "none", marginBottom: 16 }}>
              📄 Dokument öffnen
            </a>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }} onClick={() => onEdit(entry)}>✏️ Bearbeiten</button>
            {!confirmDelete
              ? <button className="btn-ghost" style={{ color: "var(--red)", fontSize: 13 }} onClick={() => setConfirmDelete(true)}>🗑️ Löschen</button>
              : <button className="btn-ghost" style={{ color: "var(--red)", fontSize: 13 }} onClick={() => onDelete(entry.id)}>Wirklich löschen?</button>
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntryList({ category, entries, onDelete, onEdit }) {
  const config = CATEGORY_CONFIG[category];
  if (!config) return null;
  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 24 }}>{config.icon}</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{config.label}</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{entries.length} Einträge</div>
        </div>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: "48px 0", fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{config.icon}</div>
          Noch keine {config.label} – tippe auf + um einen Eintrag anzulegen
        </div>
      ) : entries.map((entry) => (
        <EntryCard key={entry.id} category={category} entry={entry} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </div>
  );
}

export { CATEGORY_CONFIG };
