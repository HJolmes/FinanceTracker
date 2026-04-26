const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_PDF_BYTES = 4 * 1024 * 1024;

function getKey() {
  return localStorage.getItem("financetracker_claude_key") || "";
}

function parseFirstJson(text) {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  throw new Error("No JSON found in response");
}

async function callClaude(messages, maxTokens = 1024) {
  const key = getKey();
  if (!key) throw new Error("Kein Claude API-Key konfiguriert");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

function categoryFieldsPrompt(category) {
  const fields = {
    versicherungen:
      "name, anbieter, typ, beitrag, intervall, faelligkeit, policennummer, rueckkaufswert, monatsrenteJetzt, renteMit67Niedrig, renteMit67Hoch, renteGarantiert, notiz",
    sparplaene:
      "name, anbieter, typ, beitrag, intervall, depot, isin, ticker, anteile, startdatum, depotwert, notiz",
    leasing:
      "name, anbieter, typ, rate, intervall, laufzeit, restwert, faelligkeit, notiz",
    bankkonten:
      "name, bank, typ, iban, kontonummer, kontostand, notiz",
    steuerbelege:
      "datum (YYYY-MM-DD), betrag, mwst, netto7, netto19, kategorie, beschreibung, partner",
  };
  return fields[category] || "name, betrag, notiz";
}

export async function extractFromPDF(file, category) {
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF zu groß (max 4 MB)");
  const base64 = await fileToBase64(file);
  const prompt =
    `Extrahiere aus diesem Dokument alle Felder für die Kategorie "${category}": ${categoryFieldsPrompt(category)}. ` +
    (category === "steuerbelege"
      ? "Extrahiere auch den 7%/19% MwSt-Split (netto7, netto19). Felder 'teilnehmer' und 'zweck' NICHT extrahieren. "
      : "") +
    "Alle Beträge in Euro. NUR JSON zurückgeben, keine Erklärungen.";
  const text = await callClaude([
    {
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: prompt },
      ],
    },
  ]);
  return parseFirstJson(text);
}

export async function extractFromImage(file, category) {
  const base64 = await fileToBase64(file);
  const mediaType = file.type || "image/jpeg";
  const prompt =
    `Extrahiere aus diesem Bild alle Felder für die Kategorie "${category}": ${categoryFieldsPrompt(category)}. ` +
    (category === "steuerbelege"
      ? "Extrahiere auch den 7%/19% MwSt-Split (netto7, netto19). Felder 'teilnehmer' und 'zweck' NICHT extrahieren. "
      : "") +
    "Alle Beträge in Euro. NUR JSON zurückgeben, keine Erklärungen.";
  const text = await callClaude([
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: prompt },
      ],
    },
  ]);
  return parseFirstJson(text);
}

export async function buildDocumentName(file, category) {
  const isImage = file.type && file.type.startsWith("image/");
  const base64 = await fileToBase64(file);
  const prompt =
    "Lies dieses Dokument und extrahiere: Datum, Anbieter/Partner, Dokumenttyp. " +
    `Gib exakt zurück: YYYY-MM-DD_${category}_[Anbieter]_[Dokumenttyp].pdf ` +
    "Keine Leerzeichen, Umlaute ersetzen (ä→ae, ö→oe, ü→ue, ß→ss). " +
    "Beispiel: 2024-03-15_versicherungen_Allianz_Beitragsrechnung.pdf " +
    "Nur den Dateinamen zurückgeben, nichts anderes.";
  const content = isImage
    ? [
        { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
        { type: "text", text: prompt },
      ]
    : [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: prompt },
      ];
  const text = await callClaude([{ role: "user", content }], 256);
  return text.trim().replace(/\s+/g, "_");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function hasApiKey() {
  return Boolean(getKey());
}
