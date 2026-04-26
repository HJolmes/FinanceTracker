import * as XLSX from "xlsx";

export function exportSteuerbelege(steuerbelege, jahr) {
  const filtered = steuerbelege.filter(
    (b) => b.datum && b.datum.startsWith(String(jahr))
  );

  const rows = filtered.map((b) => ({
    Datum: b.datum || "",
    Partner: b.partner || "",
    Kategorie: b.kategorie || "",
    Betrag: parseFloat(b.betrag) || 0,
    MwSt: parseFloat(b.mwst) || 0,
    "Netto 7%": parseFloat(b.netto7) || 0,
    "Netto 19%": parseFloat(b.netto19) || 0,
    Teilnehmer: b.teilnehmer || "",
    Zweck: b.zweck || "",
    "Dokument-URL": b.dokument || "",
  }));

  const sumRow = {
    Datum: "GESAMT",
    Partner: "",
    Kategorie: "",
    Betrag: rows.reduce((s, r) => s + r.Betrag, 0),
    MwSt: rows.reduce((s, r) => s + r.MwSt, 0),
    "Netto 7%": rows.reduce((s, r) => s + r["Netto 7%"], 0),
    "Netto 19%": rows.reduce((s, r) => s + r["Netto 19%"], 0),
    Teilnehmer: "",
    Zweck: "",
    "Dokument-URL": "",
  };
  rows.push(sumRow);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Steuerbelege ${jahr}`);

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Steuerbelege_${jahr}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
