// src/components/TaxReceipts.js
import React, { useState } from "react";

const KATEGORIEN = ["Bewirtung", "Fahrtkosten", "Arbeitsmittel", "Fortbildung", "Bürobedarf", "Sonstiges"];

function ReceiptCard({ receipt, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{ marginBottom: 10, cursor: "pointer" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 2 }}>
            {receipt.datum} · {receipt.kategorie}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {receipt.beschreibung || receipt.partner || "Beleg"}
          </div>
          {receipt.partner && receipt.beschreibung && (
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 1 }}>{receipt.partner}</div>
          )}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", flexShrink: 0, marginLeft: 12 }}>
          {Number(receipt.betrag || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          {receipt.zweck && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Zweck</div>
              <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{receipt.zweck}</div>
            </div>
          )}
          {receipt.mwst && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>MwSt.</div>
              <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{receipt.mwst} %</div>
            </div>
          )}
          {receipt.dokument && (
            <div style={{ marginBottom: 8 }}>
              <a href={receipt.dokument} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: "var(--blue)", textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}>
                📎 Beleg öffnen
              </a>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: "8px" }}
              onClick={(e) => { e.stopPropagation(); onEdit(receipt); }}>
              Bearbeiten
            </button>
            <button
              style={{ background: "var(--red)", color: "#fff", padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }}>
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaxReceipts({ receipts = [], onDelete, onEdit }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = [...new Set(receipts.map((r) => r.datum?.slice(0, 4)).filter(Boolean))].sort().reverse();
  if (!years.includes(String(currentYear))) years.unshift(String(currentYear));

  const filtered = receipts.filter((r) => r.datum?.startsWith(String(selectedYear)));

  const grouped = {};
  KATEGORIEN.forEach((k) => { grouped[k] = []; });
  filtered.forEach((r) => {
    const cat = r.kategorie || "Sonstiges";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  const total = filtered.reduce((sum, r) => sum + (Number(r.betrag) || 0), 0);
  const activeCats = KATEGORIEN.filter((k) => grouped[k]?.length > 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {years.map((y) => (
          <button key={y}
            onClick={() => setSelectedYear(Number(y))}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13,
              background: selectedYear === Number(y) ? "var(--accent)" : "var(--surface2)",
              color: selectedYear === Number(y) ? "#0f1923" : "var(--text2)",
              fontWeight: selectedYear === Number(y) ? 600 : 400,
              border: "1px solid var(--border)",
            }}
          >{y}</button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16, background: "var(--surface2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Gesamt {selectedYear}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
            {total.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
          </span>
        </div>
        {activeCats.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {activeCats.map((k) => {
              const catTotal = grouped[k].reduce((s, r) => s + (Number(r.betrag) || 0), 0);
              return (
                <div key={k} style={{
                  fontSize: 11, color: "var(--text2)", background: "var(--surface)",
                  padding: "3px 8px", borderRadius: 12, border: "1px solid var(--border)",
                }}>
                  {k}: {catTotal.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text3)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15 }}>Noch keine Belege für {selectedYear}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Beleg hinzufügen mit dem + Button</div>
        </div>
      ) : (
        activeCats.map((k) => (
          <div key={k} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>{k}</div>
            {grouped[k].map((r) => (
              <ReceiptCard key={r.id} receipt={r} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
