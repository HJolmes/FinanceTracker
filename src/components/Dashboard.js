import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const toMonthly = (betrag, intervall) => {
  const b = parseFloat(betrag) || 0;
  if (intervall === "jährlich") return b / 12;
  if (intervall === "halbjährlich") return b / 6;
  if (intervall === "quartalsweise") return b / 3;
  if (intervall === "einmalig") return 0;
  return b;
};

const PIE_COLORS = ["#e8a838", "#4caf82", "#e05555", "#5b9bd5", "#9c5bb5", "#e07d38"];

function fmt(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

export default function Dashboard({ data, onAddEntry, onTabChange, faelligkeitenWarnungen, geburtsjahr }) {
  const einnahmen = (data.einnahmen || []).reduce((s, e) => s + toMonthly(e.betrag, e.intervall), 0);
  const ausgabenRegelmaessig = (data.ausgaben || []).reduce((s, e) => s + toMonthly(e.betrag, e.intervall), 0);
  const ausgaben = ausgabenRegelmaessig +
    [...(data.versicherungen || []), ...(data.leasing || []), ...(data.sparplaene || [])]
      .reduce((s, e) => s + toMonthly(e.beitrag ?? e.rate, e.intervall), 0);
  const saldo = einnahmen - ausgaben;

  const bankGuthaben = (data.bankkonten || []).reduce((s, e) => s + (parseFloat(e.kontostand) || 0), 0);
  const depotwert = (data.sparplaene || []).reduce((s, e) => s + (parseFloat(e.depotwert) || 0), 0);
  const rueckkauf = (data.versicherungen || []).reduce((s, e) => s + (parseFloat(e.rueckkaufswert) || 0), 0);
  const gesamtVermoegen = bankGuthaben + depotwert + rueckkauf;

  const categoryAusgaben = [
    { name: "Ausgaben", value: (data.ausgaben || []).reduce((s, e) => s + toMonthly(e.betrag, e.intervall), 0) },
    { name: "Versicherungen", value: (data.versicherungen || []).reduce((s, e) => s + toMonthly(e.beitrag, e.intervall), 0) },
    { name: "Leasing/Kredite", value: (data.leasing || []).reduce((s, e) => s + toMonthly(e.rate, e.intervall), 0) },
    { name: "Sparpläne", value: (data.sparplaene || []).reduce((s, e) => s + toMonthly(e.beitrag, e.intervall), 0) },
  ].filter((c) => c.value > 0);

  const verlauf = (data.vermoegensVerlauf || []).sort((a, b) => a.datum.localeCompare(b.datum));
  const showVerlauf = verlauf.length >= 2;

  const nextFaellig = [...(data.versicherungen || []), ...(data.leasing || [])]
    .filter((e) => e.faelligkeit)
    .sort((a, b) => a.faelligkeit.localeCompare(b.faelligkeit))
    .slice(0, 3);

  const alter = geburtsjahr ? new Date().getFullYear() - parseInt(geburtsjahr) : null;
  const renteVorsorge = (data.versicherungen || []).filter(
    (v) => v.monatsrenteJetzt || v.renteMit67Niedrig || v.renteMit67Hoch
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {faelligkeitenWarnungen?.length > 0 && (
        <div className="alert alert-red" style={{ cursor: "pointer" }} onClick={() => onTabChange("kalender")}>
          <strong>⚠️ Fälligkeiten in den nächsten 30 Tagen:</strong>
          <ul style={{ marginTop: 6, paddingLeft: 16 }}>
            {faelligkeitenWarnungen.map((w, i) => (
              <li key={i}>{w.entry.name} – {w.label} – {w.dateStr} ({w.diffDays} Tage)</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Einnahmen/Monat</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>{fmt(einnahmen)}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Ausgaben/Monat</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)", marginTop: 4 }}>{fmt(ausgaben)}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Saldo/Monat</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: saldo >= 0 ? "var(--green)" : "var(--red)", marginTop: 4 }}>
            {fmt(saldo)}
          </div>
        </div>
        <div className="card">
          <div style={{ color: "var(--text2)", fontSize: 12 }}>Gesamtvermögen</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>{fmt(gesamtVermoegen)}</div>
        </div>
      </div>

      {categoryAusgaben.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Kostenverteilung/Monat</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryAusgaben} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${fmt(value)}`}>
                {categoryAusgaben.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {showVerlauf && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Nettovermögen-Verlauf</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={verlauf}>
              <XAxis dataKey="datum" tick={{ fill: "var(--text3)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text3)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="wert" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {alter !== null && renteVorsorge.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Altersvorsorge-Vorschau (Alter: {alter} J.)</div>
          {renteVorsorge.map((v, i) => (
            <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 500 }}>{v.name}</div>
              {v.monatsrenteJetzt && <div style={{ color: "var(--text2)", fontSize: 13 }}>Jetzt: {fmt(v.monatsrenteJetzt)}/Monat</div>}
              {v.renteMit67Niedrig && <div style={{ color: "var(--text2)", fontSize: 13 }}>Mit 67 (niedrig): {fmt(v.renteMit67Niedrig)}/Monat</div>}
              {v.renteMit67Hoch && <div style={{ color: "var(--green)", fontSize: 13 }}>Mit 67 (hoch): {fmt(v.renteMit67Hoch)}/Monat</div>}
            </div>
          ))}
        </div>
      )}

      {nextFaellig.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Nächste Fälligkeiten</span>
            <button className="btn-ghost" style={{ fontSize: 12, padding: "2px 8px" }} onClick={() => onTabChange("kalender")}>Alle →</button>
          </div>
          {nextFaellig.map((e, i) => {
            const days = Math.floor((new Date(e.faelligkeit) - new Date()) / 86400000);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span>{e.name}</span>
                <span style={{ color: days < 30 ? "var(--red)" : days < 90 ? "var(--accent)" : "var(--green)", fontSize: 13 }}>
                  {e.faelligkeit} ({days} Tage)
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button className="btn-secondary" onClick={() => onAddEntry()}>
        + Eintrag hinzufügen
      </button>
    </div>
  );
}
