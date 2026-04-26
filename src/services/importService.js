import * as XLSX from "xlsx";

function detectCategory(headers) {
  const h = headers.map((s) => String(s).toLowerCase());
  if (h.includes("policennummer") || h.includes("rueckkaufswert")) return "versicherungen";
  if (h.includes("isin") || h.includes("depot") || h.includes("anteile")) return "sparplaene";
  if (h.includes("rate") || h.includes("restwert") || h.includes("laufzeit")) return "leasing";
  if (h.includes("iban") || h.includes("kontostand") || h.includes("kontonummer")) return "bankkonten";
  if (h.includes("mwst") || h.includes("netto7") || h.includes("steuer")) return "steuerbelege";
  if (h.includes("beitrag") || h.includes("intervall")) return "versicherungen";
  return null;
}

function mapRow(row, category) {
  const entry = { id: Date.now().toString() + Math.random().toString(36).slice(2) };
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null && v !== "") {
      entry[k.toLowerCase()] = v;
    }
  }
  return entry;
}

function isDuplicate(existing, entry) {
  return existing.some(
    (e) =>
      e.name &&
      entry.name &&
      e.name.toLowerCase() === entry.name.toLowerCase() &&
      e.anbieter &&
      entry.anbieter &&
      e.anbieter.toLowerCase() === entry.anbieter.toLowerCase()
  );
}

export async function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) return reject(new Error("Keine Daten gefunden"));
        const headers = Object.keys(rows[0]);
        const category = detectCategory(headers);
        if (!category) return reject(new Error("Kategorie nicht erkennbar"));
        const entries = rows.map((r) => mapRow(r, category));
        resolve({ category, entries });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export { isDuplicate };
