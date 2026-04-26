import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const toMonthly = (betrag, intervall) => {
  const b = parseFloat(betrag) || 0;
  if (intervall === "jährlich") return b / 12;
  if (intervall === "halbjährlich") return b / 6;
  if (intervall === "quartalsweise") return b / 3;
  if (intervall === "einmalig") return 0;
  return b;
};

function fmt(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

function CollapsibleGroup({ title, items, renderItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        className="btn-ghost"
        style={{ width: "100%", textAlign: "left", padding: "8px 0", fontWeight: 600, fontSize: 14, display: "flex", justifyContent: "space-between" }}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span style={{ color: "var(--text3)" }}>{open ? "▲" : "▼"} ({items.length})</span>
      </button>
      {open && <div style={{ paddingLeft: 8 }}>{items.map(renderItem)}</div>}
    </div>
  );
}

export default function Cashflow({ data, onAddEntry, onEditEntry }) {
  const einnahmenTotal = (data.einnahmen || []).reduce((s, e) => s + toMonthly(e.betrag, e.intervall), 0);
  const ausgabenVers = (data.versicherungen || []).reduce((s, e) => s + toMonthly(e.beitrag, e.intervall), 0);
  const ausgabenLeas = (data.leasing || []).reduce((s, e) => s + toMonthly(e.rate, e.intervall), 0);
  const ausgabenSpar = (data.sparplaene || []).reduce((s, e) => s + toMonthly(e.beitrag, e.intervall), 0);
  const ausgabenTotal = ausgabenVers + ausgabenLeas + ausgabenSpar;
  const saldo = einnahmenTotal - ausgabenTotal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Einnahmen/Monat</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>{fmt(einnahmenTotal)}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Ausgaben/Monat</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--red)", marginTop: 4 }}>{fmt(ausgabenTotal)}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Saldo/Monat</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: saldo >= 0 ? "var(--green)" : "var(--red)", marginTop: 4 }}>{fmt(saldo)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>Einnahmen</span>
          <button className="btn-secondary" style={{ fontSize: 13, padding: "6px 12px" }} onClick={() => onAddEntry("einnahmen")}>+ Einnahme</button>
        </div>
        {(data.einnahmen || []).length === 0
          ? <div style={{ color: "var(--text3)", fontSize: 13 }}>Keine Einnahmen erfasst</div>
          : (data.einnahmen || []).map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{e.name}</div>
                <div style={{ color: "var(--text3)", fontSize: 12 }}>{e.kategorie} · {e.intervall}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--green)", fontWeight: 600 }}>{fmt(e.betrag)}</span>
                <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => onEditEntry(e)}>✏️</button>
              </div>
            </div>
          ))
        }
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Ausgaben</div>
        <CollapsibleGroup
          title={`Versicherungen · ${fmt(ausgabenVers)}/Mo`}
          items={data.versicherungen || []}
          renderItem={(e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span>{e.name}</span>
              <span style={{ color: "var(--text2)" }}>{fmt(toMonthly(e.beitrag, e.intervall))}/Mo</span>
            </div>
          )}
        />
        <CollapsibleGroup
          title={`Leasing & Kredite · ${fmt(ausgabenLeas)}/Mo`}
          items={data.leasing || []}
          renderItem={(e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span>{e.name}</span>
              <span style={{ color: "var(--text2)" }}>{fmt(toMonthly(e.rate, e.intervall))}/Mo</span>
            </div>
          )}
        />
        <CollapsibleGroup
          title={`Sparpläne · ${fmt(ausgabenSpar)}/Mo`}
          items={data.sparplaene || []}
          renderItem={(e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span>{e.name}</span>
              <span style={{ color: "var(--text2)" }}>{fmt(toMonthly(e.beitrag, e.intervall))}/Mo</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}
