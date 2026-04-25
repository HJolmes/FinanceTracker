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

// Extracts the first syntactically valid JSON object from a string.
// Uses bracket counting so trailing text or nested braces don't break parsing.
function extractFirstJSON(text) {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          // reset and keep looking
          start = -1;
        }
      }
    }
  }
  throw new Error("Keine Felder erkannt");
}

async function callClaude(content, maxTokens = 512) {
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
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return extractFirstJSON(text);
}

const TYPEN = {
  versicherungen: "Krankenversicherung|Haftpflicht|Kfz|Berufsunfähigkeit|Risikoleben|Hausrat|Gebäude|Rechtsschutz|Unfallversicherung|Reiseversicherung|Lebensversicherung|Rentenversicherung|Sonstige",
  sparplaene: "ETF|Fonds|Aktienplan|Festgeld|Tagesgeld|Bausparvertrag|Sonstiges",
  leasing: "Kfz-Leasing|Immobilienkredit|Ratenkredit|Dispositionskredit|Sonstiges",
  bankkonten: "Girokonto|Tagesgeld|Festgeld|Depot|Gemeinschaftskonto|Sonstiges",
};

const INTERVALL = "monatlich|quartalsweise|halbjaehrlich|jaehrlich|einmalig";

const DETECT_PROMPT = `Analysiere dieses deutsche Finanzdokument und extrahiere alle erkennbaren Informationen. Antworte NUR mit JSON, keine Erklärung.
Der Nutzer kann die Felder danach korrigieren – trage daher alle erkennbaren Werte ein, auch wenn du nicht 100% sicher bist.

Pflichtfeld: category (versicherungen|sparplaene|leasing|bankkonten)

Felder je Kategorie:
- versicherungen: name, anbieter, typ, beitrag, intervall, faelligkeit, polizzennummer, rueckkaufswert, monatsrenteJetzt, renteMit67Niedrig, renteMit67Hoch, renteGarantiert
- sparplaene: name, anbieter, typ, beitrag, intervall, depot, isin, startdatum, depotwert
- leasing: name, anbieter, typ, rate, intervall, laufzeit, restwert, faelligkeit
- bankkonten: name, bank, typ, iban, kontonummer, kontostand

Erlaubte Werte:
- typ versicherungen: ${TYPEN.versicherungen}
- typ sparplaene: ${TYPEN.sparplaene}
- typ leasing: ${TYPEN.leasing}
- typ bankkonten: ${TYPEN.bankkonten}
- intervall: ${INTERVALL}

Hinweise:
- name: Bezeichnung des Vertrags/Produkts
- anbieter/bank: Name des Versicherers oder der Bank (Briefkopf/Logo)
- beitrag/rate: regelmäßige Zahlung ohne €-Zeichen (z.B. 45.90)
- polizzennummer: Vertragsnummer, Versicherungsscheinnummer
- renteMit67Niedrig/Hoch: Prognose-Spanne aus Standmitteilung (2%/6%-Szenario)
- renteGarantiert: nur bei konkretem Rentenbescheid
- Daten: YYYY-MM-DD
- Zahlen: ohne Einheit, Punkt als Dezimaltrennzeichen

NUR JSON zurückgeben, keine Erklärungen oder zusätzlicher Text.`;

const FIELDS_PROMPT = (category, fieldList) => {
  let p = `Extrahiere aus diesem deutschen Finanzdokument (${category}) alle erkennbaren Felder als JSON: ${fieldList}\n`;
  p += `typ: ${TYPEN[category] || "Sonstige"} — exakt so, Gross-/Kleinschreibung beachten\nintervall: ${INTERVALL}\n`;
  if (category === "versicherungen") {
    p += `renteMit67Niedrig: pessimistisches Szenario (2%), renteMit67Hoch: optimistisches Szenario (6%), renteGarantiert: nur aus Rentenbescheid\n`;
  }
  p += `Zahlen ohne Einheit (45.90), Daten YYYY-MM-DD. Fülle alle erkennbaren Felder. NUR JSON, keine Erklärungen.`;
  return p;
};

const DOC_TYPE_PROMPT = `Dokumenttyp als JSON: {"typ":"..."}
Erlaubt: Standmitteilung|Beitragsrechnung|Versicherungsschein|Nachtrag|Mahnung|Kuendigung|Kontoauszug|Depotauszug|Rentenbescheid|Sonstiges`;

const RECEIPT_PROMPT = `Analysiere diesen deutschen Beleg/Kassenbon. Antworte NUR mit JSON, keine Erklärungen.

Felder:
- datum: Belegdatum (YYYY-MM-DD)
- betrag: Gesamtbetrag inkl. MwSt (Zahl ohne €)
- mwst: dominanter MwSt-Satz (Zahl, z.B. 19 oder 7)
- netto7: Nettobetrag zu 7% MwSt (Speisen), falls ausgewiesen
- netto19: Nettobetrag zu 19% MwSt (Getränke), falls ausgewiesen
- partner: Name des Restaurants / Unternehmens
- beschreibung: kurze Beschreibung (z.B. "Geschäftsessen")
- kategorie: Bewirtung|Fahrtkosten|Arbeitsmittel|Fortbildung|Bürobedarf|Sonstiges
- teilnehmer: handschriftlich ergänzte Teilnehmer (kommagetrennt) – HANDSCHRIFT LESEN!
- zweck: handschriftlich ergänzter Anlass/Zweck – HANDSCHRIFT LESEN!

Bei Restaurantbelegen: 7% (Speisen) und 19% (Getränke) separat ausweisen falls vorhanden.
Handschriftliche Ergänzungen auf dem Beleg oder Rückseite unbedingt lesen.
NUR JSON, keine Erklärungen.`;

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
      ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }, { type: "text", text: DOC_TYPE_PROMPT }]
      : [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: DOC_TYPE_PROMPT }];
    const result = await callClaude(content);
    return result.typ || "Sonstiges";
  } catch {
    return "Sonstiges";
  }
}

export async function mapTextToFields(text, category, fields) {
  const fieldList = fields.filter((f) => !["dokument", "dokumente", "notiz"].includes(f)).join(",");
  return callClaude(`${FIELDS_PROMPT(category, fieldList)}\n\nText:\n${text.slice(0, 2500)}`, 1024);
}

export async function mapPDFToFields(file, category, fields) {
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF zu gross (max ${MAX_PDF_MB} MB)`);
  const base64 = await toBase64(file);
  const fieldList = fields.filter((f) => !["dokument", "dokumente", "notiz"].includes(f)).join(",");
  return callClaude([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
    { type: "text", text: FIELDS_PROMPT(category, fieldList) },
  ], 1024);
}

export async function detectAndExtractFromText(text) {
  const result = await callClaude(`${DETECT_PROMPT}\n\nText:\n${text.slice(0, 2500)}`, 1024);
  if (!result.category) throw new Error("Kategorie nicht erkannt");
  return result;
}

export async function detectAndExtractFromPDF(file) {
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF zu gross (max ${MAX_PDF_MB} MB)`);
  const base64 = await toBase64(file);
  const result = await callClaude([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
    { type: "text", text: DETECT_PROMPT },
  ], 1024);
  if (!result.category) throw new Error("Kategorie nicht erkannt");
  return result;
}

export async function extractReceiptFields(file) {
  if (!getClaudeApiKey()) return {};
  try {
    const base64 = await toBase64(file);
    const mediaType = file.type || (isPdf(file) ? "application/pdf" : "image/jpeg");
    const content = isPdf(file)
      ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }, { type: "text", text: RECEIPT_PROMPT }]
      : [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: RECEIPT_PROMPT }];
    return await callClaude(content, 768);
  } catch {
    return {};
  }
}
