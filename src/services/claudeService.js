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
      max_tokens: 512,
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

const TYPEN = {
  versicherungen: "Krankenversicherung|Haftpflicht|Kfz|Berufsunfähigkeit|Risikoleben|Hausrat|Gebäude|Rechtsschutz|Unfallversicherung|Reiseversicherung|Lebensversicherung|Rentenversicherung|Sonstige",
  sparplaene: "ETF|Fonds|Aktienplan|Festgeld|Tagesgeld|Bausparvertrag|Sonstiges",
  leasing: "Kfz-Leasing|Immobilienkredit|Ratenkredit|Dispositionskredit|Sonstiges",
  bankkonten: "Girokonto|Tagesgeld|Festgeld|Depot|Gemeinschaftskonto|Sonstiges",
};

const INTERVALL = "monatlich|quartalsweise|halbjaehrlich|jaehrlich|einmalig";

const DETECT_PROMPT = `Analysiere dieses deutsche Finanzdokument. Antworte NUR mit JSON, keine Erklaerung.

Kategorie: versicherungen|sparplaene|leasing|bankkonten
Felder:
- versicherungen: name,anbieter,typ,beitrag,intervall,faelligkeit,polizzennummer,rueckkaufswert,monatsrenteJetzt,renteMit67Niedrig,renteMit67Hoch,renteGarantiert
- sparplaene: name,anbieter,typ,beitrag,intervall,depot,isin,startdatum,depotwert
- leasing: name,anbieter,typ,rate,intervall,laufzeit,restwert,faelligkeit
- bankkonten: name,bank,typ,iban,kontonummer,kontostand

typ versicherungen: ${TYPEN.versicherungen}
typ sparplaene: ${TYPEN.sparplaene}
typ leasing: ${TYPEN.leasing}
typ bankkonten: ${TYPEN.bankkonten}
intervall: ${INTERVALL}

Rentenfelder (nur bei Rentenversicherung/Lebensversicherung):
- renteMit67Niedrig: schlechteste Prognose Monatsrente ab 67 (z.B. 2% Szenario aus Standmitteilung)
- renteMit67Hoch: beste Prognose Monatsrente ab 67 (z.B. 6% Szenario aus Standmitteilung)
- renteGarantiert: garantierte Monatsrente aus konkretem Rentenbescheid (NICHT aus Standmitteilung)

Zahlen ohne Waehrungszeichen (45.90), Daten YYYY-MM-DD, typ+intervall exakt wie angegeben, nur sichere Felder.
Beispiel: {"category":"versicherungen","name":"Allianz RV","typ":"Rentenversicherung","renteMit67Niedrig":"320.00","renteMit67Hoch":"580.00"}`;

const FIELDS_PROMPT = (category, fieldList) => {
  let p = `Extrahiere aus diesem deutschen Finanzdokument (${category}) folgende Felder als JSON: ${fieldList}
`;
  p += `typ: ${TYPEN[category] || "Sonstige"} — exakt so, Gross-/Kleinschreibung beachten
intervall: ${INTERVALL}
`;
  if (category === "versicherungen") {
    p += `renteMit67Niedrig: pessimistisches Szenario (2%), renteMit67Hoch: optimistisches Szenario (6%), renteGarantiert: nur aus Rentenbescheid\n`;
  }
  p += `Zahlen ohne Waehrungszeichen (45.90), Daten YYYY-MM-DD, nur sichere Felder, NUR JSON.`;
  return p;
};

const DOC_TYPE_PROMPT = `Dokumenttyp als JSON: {"typ":"..."}
Erlaubt: Standmitteilung|Beitragsrechnung|Versicherungsschein|Nachtrag|Mahnung|Kuendigung|Kontoauszug|Depotauszug|Rentenbescheid|Sonstiges`;

const RECEIPT_PROMPT = `Analysiere diesen Beleg/Kassenbon. Antworte NUR mit JSON.
Felder: datum (YYYY-MM-DD), betrag (Zahl ohne €), mwst (MwSt-Satz als Zahl z.B. 19), partner (Firma/Lieferant), beschreibung (kurze Beschreibung), kategorie (Bewirtung|Fahrtkosten|Arbeitsmittel|Fortbildung|Bürobedarf|Sonstiges), zweck (geschäftlicher Zweck).
Nur sichere Felder, NUR JSON.`;

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
  return callClaude(`${FIELDS_PROMPT(category, fieldList)}\n\nText:\n${text.slice(0, 2500)}`);
}

export async function mapPDFToFields(file, category, fields) {
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF zu gross (max ${MAX_PDF_MB} MB)`);
  const base64 = await toBase64(file);
  const fieldList = fields.filter((f) => !["dokument", "dokumente", "notiz"].includes(f)).join(",");
  return callClaude([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
    { type: "text", text: FIELDS_PROMPT(category, fieldList) },
  ]);
}

export async function detectAndExtractFromText(text) {
  const result = await callClaude(`${DETECT_PROMPT}\n\nText:\n${text.slice(0, 2500)}`);
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

export async function extractReceiptFields(file) {
  if (!getClaudeApiKey()) return {};
  try {
    const base64 = await toBase64(file);
    const mediaType = file.type || (isPdf(file) ? "application/pdf" : "image/jpeg");
    const content = isPdf(file)
      ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }, { type: "text", text: RECEIPT_PROMPT }]
      : [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: RECEIPT_PROMPT }];
    return await callClaude(content);
  } catch {
    return {};
  }
}
