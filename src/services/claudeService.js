const CLAUDE_KEY = "financetracker_claude_key";
const MAX_PDF_MB = 4;

export function getClaudeApiKey() {
  return localStorage.getItem(CLAUDE_KEY) || "";
}

export function saveClaudeApiKey(key) {
  if (key.trim()) localStorage.setItem(CLAUDE_KEY, key.trim());
  else localStorage.removeItem(CLAUDE_KEY);
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const isPdf = (file) => file.type === "application/pdf";

async function callClaude(content) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("NO_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Keine Felder erkannt");
  return JSON.parse(match[0]);
}

function getCategoryName(cat) {
  return {
    versicherungen: "Versicherungsvertrag",
    sparplaene: "Sparplan / ETF",
    leasing: "Leasing- oder Kreditvertrag",
    bankkonten: "Bankdokument",
  }[cat] || "Finanzdokument";
}

// Werte muessen EXAKT den <option>-Werten in EntryList.js entsprechen
const TYPEN = {
  versicherungen: "Krankenversicherung | Haftpflicht | Kfz | Berufsunfähigkeit | Risikoleben | Hausrat | Gebäude | Rechtsschutz | Unfallversicherung | Reiseversicherung | Lebensversicherung | Rentenversicherung | Sonstige",
  sparplaene: "ETF | Fonds | Aktienplan | Festgeld | Tagesgeld | Bausparvertrag | Sonstiges",
  leasing: "Kfz-Leasing | Immobilienkredit | Ratenkredit | Dispositionskredit | Sonstiges",
  bankkonten: "Girokonto | Tagesgeld | Festgeld | Depot | Gemeinschaftskonto | Sonstiges",
};

const DETECT_PROMPT = `Du bist Experte fuer deutsche Finanz- und Versicherungsdokumente.

AUFGABE: Bestimme die Kategorie und extrahiere alle erkennbaren Felder.

Kategorien:
- versicherungen: Versicherungspolice, Beitragsrechnung, Standmitteilung einer Versicherung
- sparplaene: ETF-Sparplan, Fonds, Bausparvertrag, Tagesgeld, Festgeld, Depotauszug
- leasing: Fahrzeugleasing, Ratenkredit, Darlehensvertrag
- bankkonten: Girokonto, Kontoauszug, IBAN-Dokument

Felder pro Kategorie (verwende GENAU diese Schluessel):
- versicherungen: name, anbieter, typ, beitrag, intervall, faelligkeit, polizzennummer, rueckkaufswert, monatsrenteJetzt, monatsrenteMit67
- sparplaene: name, anbieter, typ, beitrag, intervall, depot, isin, startdatum, depotwert
- leasing: name, anbieter, typ, rate, intervall, laufzeit, restwert, faelligkeit
- bankkonten: name, bank, typ, iban, kontonummer, kontostand

Feldbeschreibungen fuer Bestandsfelder:
- rueckkaufswert: aktueller Rueckkaufswert der Versicherung (z.B. aus Standmitteilung)
- monatsrenteJetzt: prognostizierte monatliche Rente bei sofortigem Rentenbeginn
- monatsrenteMit67: prognostizierte monatliche Rente bei Rentenbeginn mit 67 Jahren
- depotwert: aktueller Gesamtwert des Depots / Portfolios
- kontostand: aktueller Kontostand / Saldo

Erlaubte Werte fuer "typ" (gib den Wert EXAKT so zurueck, Gross-/Kleinschreibung beachten):
- versicherungen: Krankenversicherung | Haftpflicht | Kfz | Berufsunfähigkeit | Risikoleben | Hausrat | Gebäude | Rechtsschutz | Unfallversicherung | Reiseversicherung | Lebensversicherung | Rentenversicherung | Sonstige
- sparplaene: ETF | Fonds | Aktienplan | Festgeld | Tagesgeld | Bausparvertrag | Sonstiges
- leasing: Kfz-Leasing | Immobilienkredit | Ratenkredit | Dispositionskredit | Sonstiges
- bankkonten: Girokonto | Tagesgeld | Festgeld | Depot | Gemeinschaftskonto | Sonstiges

Regeln:
- Antworte NUR mit JSON, keine Erklaerung
- Zahlen: Dezimalpunkt, kein Waehrungszeichen (z.B. 45.90)
- Daten: YYYY-MM-DD
- Nur Felder die eindeutig erkennbar sind
- intervall muss einer dieser Werte sein: monatlich, quartalsweise, halbjaehrlich, jaehrlich, einmalig
- typ MUSS exakt einem der erlaubten Werte entsprechen
- faelligkeit: naechster Zahlungstermin oder Vertragsbeginn

Beispiel Ausgabe:
{"category":"versicherungen","name":"Allianz Haftpflicht","anbieter":"Allianz","typ":"Haftpflicht","beitrag":"8.90","intervall":"monatlich","polizzennummer":"HV-123456"}`;

const FIELDS_PROMPT = (category, fieldList) =>
  `Du bist Experte fuer deutsche Finanz- und Versicherungsdokumente (${getCategoryName(category)}).

Extrahiere diese Felder: ${fieldList}

Feldbeschreibungen fuer Bestandsfelder:
- rueckkaufswert: aktueller Rueckkaufswert der Versicherung (z.B. aus Standmitteilung)
- monatsrenteJetzt: prognostizierte monatliche Rente bei sofortigem Rentenbeginn
- monatsrenteMit67: prognostizierte monatliche Rente bei Rentenbeginn mit 67 Jahren
- depotwert: aktueller Gesamtwert des Depots / Portfolios
- kontostand: aktueller Kontostand / Saldo

Erlaubte Werte fuer "typ" (gib den Wert EXAKT so zurueck, Gross-/Kleinschreibung beachten):
${TYPEN[category] || "Sonstige"}

Regeln:
- Antworte NUR mit JSON, keine Erklaerung
- Zahlen: Dezimalpunkt, kein Waehrungszeichen (z.B. 45.90)
- Daten: YYYY-MM-DD
- Nur Felder die eindeutig erkennbar sind
- intervall muss einer dieser Werte sein: monatlich, quartalsweise, halbjaehrlich, jaehrlich, einmalig
- typ MUSS exakt einem der erlaubten Werte entsprechen
- faelligkeit: naechster Zahlungstermin oder Vertragsbeginn`;

const DOC_TYPE_PROMPT = `Bestimme den Typ dieses deutschen Finanz- oder Versicherungsdokuments.
Antworte NUR mit JSON: {"typ": "..."}
Erlaubte Typen: Standmitteilung | Beitragsrechnung | Versicherungsschein | Nachtrag | Mahnung | Kuendigung | Kontoauszug | Depotauszug | Sonstiges`;

export function buildDocumentName(typ, anbieter) {
  const date = new Date().toISOString().slice(0, 10);
  const clean = (s) => (s || "").replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_").replace(/_+/g, "_").slice(0, 25).replace(/_$/, "");
  const t = clean(typ || "Dokument");
  const a = clean(anbieter);
  return a ? `${date}_${t}_${a}.pdf` : `${date}_${t}.pdf`;
}

export async function detectDocumentType(file) {
  if (!getClaudeApiKey()) return "Sonstiges";
  try {
    const base64 = await toBase64(file);
    const mediaType = file.type || (isPdf(file) ? "application/pdf" : "image/jpeg");
    const content = isPdf(file)
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: DOC_TYPE_PROMPT },
        ]
      : [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: DOC_TYPE_PROMPT },
        ];
    const result = await callClaude(content);
    return result.typ || "Sonstiges";
  } catch {
    return "Sonstiges";
  }
}

export async function mapTextToFields(text, category, fields) {
  const fieldList = fields.filter((f) => !["dokument", "dokumente", "notiz"].includes(f)).join(", ");
  return callClaude(`${FIELDS_PROMPT(category, fieldList)}\n\nText:\n${text.slice(0, 3500)}`);
}

export async function mapPDFToFields(file, category, fields) {
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF zu gross (max ${MAX_PDF_MB} MB)`);
  const base64 = await toBase64(file);
  const fieldList = fields.filter((f) => !["dokument", "dokumente", "notiz"].includes(f)).join(", ");
  return callClaude([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
    { type: "text", text: FIELDS_PROMPT(category, fieldList) },
  ]);
}

export async function detectAndExtractFromText(text) {
  const result = await callClaude(`${DETECT_PROMPT}\n\nText:\n${text.slice(0, 3500)}`);
  if (!result.category) throw new Error("Kategorie nicht erkannt");
  return result;
}

export async function detectAndExtractFromPDF(file) {
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF zu gross (max ${MAX_PDF_MB} MB)`);
  const base64 = await toBase64(file);
  const result = await callClaude([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
    { type: "text", text: DETECT_PROMPT },
  ]);
  if (!result.category) throw new Error("Kategorie nicht erkannt");
  return result;
}
