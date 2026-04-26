import React, { useState } from "react";
import { exportSteuerbelege } from "../services/exportService";

function fmt(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(parseFloat(n) || 0);
}

function BelegCard({ beleg, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [viewDoc, setViewDoc] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const warn = beleg.kategorie === "Bewirtung" && (!beleg.teilnehmer || !beleg.zweck);

  return (
    <>
      {viewDoc && beleg.dokument && (
        <div className="modal-overlay center" onClick={() => setViewDoc(false)}>
          <div className="modal-dialog" style={{ maxWidth: 720, width: "95%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px" }}>
              <button className="btn-ghost" onClick={() => setViewDoc(false)}>✕ Schließen</button>
            </div>
            <iframe src={beleg.dokument} title="Beleg" style={{ width: "100%", height: "70vh", border: "none" }} />
          </div>
        </div>
      )}
      <div className="card" style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              {beleg.partner || "–"}
              {warn && <span title="Bewirtung unvollständig" style={{ color: "var(--accent)" }}>⚠️</span>}
            </div>
            <div style={{ color: "var(--text2)", fontSize: 13 }}>
              {beleg.datum} · {beleg.kategorie} · {fmt(beleg.betrag)}
            </div>
          </div>
          <span style={{ color: "var(--text3)" }}>{expanded ? "▲" : "▼"}</span>
        </div>

        {expanded && (
          <div style={{ marginTop: 12 }}>
            <div className="divider" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 13 }}>
              {beleg.mwst && <><span style={{ color: "var(--text3)" }}>MwSt</span><span>{fmt(beleg.mwst)}</span></>}
              {beleg.netto7 && <><span style={{ color: "var(--text3)" }}>Netto 7%</span><span>{fmt(beleg.netto7)}</span></>}
              {beleg.netto19 && <><span style={{ color: "var(--text3)" }}>Netto 19%</span><span>{fmt(beleg.netto19)}</span></>}
              {beleg.teilnehmer && <><span style={{ color: "var(--text3)" }}>Teilnehmer</span><span>{beleg.teilnehmer}</span></>}
              {beleg.zweck && <><span style={{ color: "var(--text3)" }}>Zweck</span><span>{beleg.zweck}</span></>}
              {beleg.beschreibung && <><span style={{ color: "var(--text3)" }}>Beschreibung</span><span>{beleg.beschreibung}</span></>}
            </div>
            {beleg.dokument && (
              <button className="btn-ghost" style={{ fontSize: 13, marginTop: 8 }} onClick={() => setViewDoc(true)}>
                📄 Dokument öffnen
              </button>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onEdit(beleg)}>✏️ Bearbeiten</button>
              {confirmDel
                ? <>
                    <button className="btn-danger" style={{ flex: 1 }} onClick={() => onDelete(beleg.id)}>Wirklich löschen?</button>
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

export default function TaxReceipts({ data, onEdit, onDelete }) {
  const belege = data.steuerbelege || [];
  const years = [...new Set(belege.map((b) => b.datum?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const [jahr, setJahr] = useState(years[0] || String(new Date().getFullYear()));

  const filtered2 = belege.filter((b) => b.datum?.startsWith(jahr));
  const summe = filtered2.reduce((s, b) => s + (parseFloat(b.betrag) || 0), 0);

  const byKat = {};
  for (const b of filtered2) {
    byKat[b.kategorie || "Sonstiges"] = (byKat[b.kategorie || "Sonstiges"] || 0) + (parseFloat(b.betrag) || 0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {years.map((y) => (
          <button key={y} onClick={() => setJahr(y)}
            style={{ padding: "6px 14px", fontSize: 13, borderRadius: 6, background: y === jahr ? "var(--accent)" : "var(--bg3)", color: y === jahr ? "#0f1923" : "var(--text2)", border: "none", cursor: "pointer" }}>
            {y}
          </button>
        ))}
        <button className="btn-secondary" style={{ marginLeft: "auto", fontSize: 13 }} onClick={() => exportSteuerbelege(belege, jahr)}>
          📊 Excel exportieren
        </button>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Jahressumme {jahr}: <span style={{ color: "var(--accent)" }}>
          {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(summe)}
        </span></div>
        {Object.entries(byKat).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
            <span style={{ color: "var(--text2)" }}>{k}</span>
            <span>{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v)}</span>
          </div>
        ))}
      </div>

      {filtered2.map((b) => (
        <BelegCard key={b.id} beleg={b} onEdit={onEdit} onDelete={onDelete} />
      ))}

      {filtered2.length === 0 && (
        <div style={{ color: "var(--text3)", textAlign: "center", padding: "40px" }}>
          Keine Belege für {jahr}.
        </div>
      )}
    </div>
  );
}
