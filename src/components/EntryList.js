import React, { useState } from "react";

const CATEGORY_CONFIG = {
  versicherungen: {
    label: "Versicherungen", icon: "🛡️",
    fields: ["name","anbieter","typ","beitrag","intervall","faelligkeit","polizzennummer","rueckkaufswert","monatsrenteJetzt","monatsrenteMit67","notiz"],
    typen: ["Krankenversicherung","Haftpflicht","Kfz","Berufsunfähigkeit","Risikoleben","Hausrat","Gebäude","Rechtsschutz","Unfallversicherung","Reiseversicherung","Lebensversicherung","Rentenversicherung","Sonstige"],
  },
  sparplaene: {
    label: "Sparpläne & ETF", icon: "📈",
    fields: ["name","anbieter","typ","beitrag","intervall","depot","isin","startdatum","depotwert","notiz"],
    typen: ["ETF","Fonds","Aktienplan","Festgeld","Tagesgeld","Bausparvertrag","Sonstiges"],
  },
  leasing: {
    label: "Leasing & Kredite", icon: "🚗",
    fields: ["name","anbieter","typ","rate","intervall","laufzeit","restwert","faelligkeit","notiz"],
    typen: ["Kfz-Leasing","Immobilienkredit","Ratenkredit","Dispositionskredit","Sonstiges"],
  },
  bankkonten: {
    label: "Bankkonten", icon: "🏦",
    fields: ["name","bank","typ","iban","kontonummer","kontostand","notiz"],
    typen: ["Girokonto","Tagesgeld","Festgeld","Depot","Gemeinschaftskonto","Sonstiges"],
  },
};

function getMainValue(category, entry) {
  if (category === "versicherungen" || category === "sparplaene") return entry.beitrag;
  if (category === "leasing") return entry.rate;
  return null;
}

function getUpdateReminder(dokumente) {
  if (!dokumente || dokumente.length === 0) return null;
  const datesMs = dokumente
    .map((d) => d.datum ? new Date(d.datum).getTime() : NaN)
    .filter((t) => !isNaN(t))
    .sort((a, b) => b - a);
  if (datesMs.length === 0) return null;
  const lastMs = datesMs[0];
  const intervalMs = datesMs.length >= 2
    ? (datesMs[0] - datesMs[datesMs.length - 1]) / (datesMs.length - 1)
    : 365 * 24 * 60 * 60 * 1000;
  const nextMs = lastMs + intervalMs;
  const daysUntil = Math.round((nextMs - Date.now()) / (24 * 60 * 60 * 1000));
  return { nextDate: new Date(nextMs).toISOString().slice(0, 10), daysUntil };
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

function BestandRow({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, color: "var(--text3)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: highlight ? "var(--green)" : "var(--accent)" }}>
        {parseFloat(value).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
      </div>
    </div>
  );
}

function EntryCard({ category, entry, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const value = getMainValue(category, entry);
  const hasBestand = entry.rueckkaufswert || entry.monatsrenteJetzt || entry.monatsrenteMit67 || entry.depotwert || entry.kontostand;
  const dokumente = entry.dokumente || (entry.dokument ? [{ url: entry.dokument, name: "Dokument", typ: "Sonstiges", datum: "" }] : []);
  const reminder = getUpdateReminder(dokumente);
  const showReminder = reminder && reminder.daysUntil <= 30;
  const isOverdue = reminder && reminder.daysUntil <= 0;

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
          {entry.kontostand && !value && (
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--green)" }}>
              {parseFloat(entry.kontostand).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </div>
          )}
        </div>
      </div>

      {showReminder && (
        <div style={{
          marginTop: 8, padding: "5px 10px", borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 600,
          background: isOverdue ? "rgba(240,96,96,0.12)" : "rgba(232,168,56,0.10)",
          color: isOverdue ? "var(--red)" : "var(--accent)",
          border: `1px solid ${isOverdue ? "rgba(240,96,96,0.25)" : "rgba(232,168,56,0.25)"}`,
        }}>
          {isOverdue
            ? `⚠️ Dokument-Update überfällig (erwartet ${reminder.nextDate})`
            : `📅 Nächstes Dokument in ${reminder.daysUntil} Tagen erwartet (${reminder.nextDate})`
          }
        </div>
      )}

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

          {hasBestand && (
            <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Bestand / Wert</div>
              {entry.rueckkaufswert && <BestandRow label="Rückkaufswert (aktuell)" value={entry.rueckkaufswert} />}
              {entry.depotwert && <BestandRow label="Depotwert (aktuell)" value={entry.depotwert} highlight />}
              {entry.kontostand && <BestandRow label="Kontostand (aktuell)" value={entry.kontostand} highlight />}
              {entry.monatsrenteJetzt && <BestandRow label="Monatliche Rente (jetzt)" value={entry.monatsrenteJetzt} />}
              {entry.monatsrenteMit67 && <BestandRow label="Monatliche Rente (mit 67)" value={entry.monatsrenteMit67} highlight />}
            </div>
          )}

          {dokumente.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Dokumente ({dokumente.length})</div>
              {dokumente.map((doc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>
                      {doc.typ}{doc.datum ? ` · ${doc.datum}` : ""}
                      {i === 0 && <span style={{ color: "var(--green)", marginLeft: 6, fontWeight: 600 }}>● Aktuell</span>}
                    </div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--blue)", flexShrink: 0 }}>Öffnen</a>
                </div>
              ))}
            </div>
          )}

          {entry.notiz && (
            <div style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
              📝 {entry.notiz}
            </div>
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
