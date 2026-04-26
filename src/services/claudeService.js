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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callClaude(messages, maxTokens = 1024) {
  const key = getKey();
  if (!key) throw new Error("Kein Claude API-Key konfiguriert");
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1));
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
    if (res.status === 429) {
      lastError = new Error("Claude API 429 – Rate limit, bitte kurz warten");
      continue;
    }
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json();
    return data.content[0].text;
  }
  throw lastError;
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
    einnahmen:
      "name, betrag (Nettobetrag), bruttoGehalt, steuerklasse (Zahl 1–6), lohnsteuer, bav (bAV-Beitrag €/Monat), sachbezug (geldwerter Vorteil €/Monat), kirchensteuer (true/false), kinderlos (true/false), intervall, kategorie",
    ausgaben:
      "name, anbieter, typ, betrag, intervall, faelligkeit (YYYY-MM-DD), email (Kontakt-E-Mail), notiz",
  };
  return fields[category] || "name, betrag, notiz";
}

export async function generateKuendigungsschreiben(entry, category) {
  const details = JSON.stringify(entry, null, 2);
  const prompt =
    `Du bist ein deutscher Rechtsassistent. Erstelle ein rechtssicheres Kündigungsschreiben für folgenden Vertrag:\n\n${details}\n\n` +
    `Antworte NUR mit folgendem JSON:\n` +
    `{\n` +
    `  "brief": "vollständiger Brieftext mit Betreff, Anrede, Kündigung, Bitte um Bestätigung, Grüße",\n` +
    `  "email": "kuendigung@anbieter.de oder null wenn keine E-Mail-Kündigung möglich",\n` +
    `  "anleitung": ["Schritt 1: ...", "Schritt 2: ..."] oder null wenn E-Mail ausreicht\n` +
    `}\n\n` +
    `Hinweise:\n` +
    `- Nutze bekannte Kündigungs-E-Mail-Adressen großer Anbieter (z.B. Spotify, Netflix, Fitnessstudios, Telekommunikation)\n` +
    `- Wenn der Anbieter keine E-Mail-Kündigung akzeptiert, setze email auf null und gib eine Schritt-für-Schritt-Anleitung\n` +
    `- Der Brief soll professionell, höflich und rechtlich korrekt sein\n` +
    `- Füge "fristgerecht" und "zum nächstmöglichen Termin" ein\n` +
    `- NUR JSON zurückgeben, keine Erklärungen außerhalb des JSON`;
  const text = await callClaude([{ role: "user", content: [{ type: "text", text: prompt }] }], 2048);
  return parseFirstJson(text);
}

function buildFileContent(file, base64) {
  if (file.type && file.type.startsWith("image/")) {
    return { type: "image", source: { type: "base64", media_type: file.type, data: base64 } };
  }
  return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
}

// Single API call: extract fields + generate document name for a known category
export async function extractAndName(file, category) {
  if (!file.type?.startsWith("image/") && file.size > MAX_PDF_BYTES) throw new Error("PDF zu groß (max 4 MB)");
  const base64 = await fileToBase64(file);
  const steuerExtra = category === "steuerbelege"
    ? "Extrahiere auch den 7%/19% MwSt-Split (netto7, netto19). Felder 'teilnehmer' und 'zweck' NICHT extrahieren. "
    : "";
  const prompt =
    `Analysiere dieses Dokument und gib exakt dieses JSON zurück:\n` +
    `{\n` +
    `  "fields": { /* Felder für Kategorie "${category}": ${categoryFieldsPrompt(category)}. ${steuerExtra}Alle Beträge in Euro. */ },\n` +
    `  "documentName": "YYYY-MM-DD_${category}_[Anbieter]_[Dokumenttyp].pdf"\n` +
    `}\n` +
    `Keine Leerzeichen im documentName, Umlaute ersetzen (ä→ae, ö→oe, ü→ue, ß→ss). NUR JSON zurückgeben.`;
  const text = await callClaude(
    [{ role: "user", content: [buildFileContent(file, base64), { type: "text", text: prompt }] }],
    1536
  );
  const result = parseFirstJson(text);
  return {
    fields: result.fields || {},
    documentName: (result.documentName || "").trim().replace(/\s+/g, "_"),
  };
}

// Single API call: auto-detect category + extract fields + generate document name
export async function detectAndExtract(file) {
  if (!file.type?.startsWith("image/") && file.size > MAX_PDF_BYTES) throw new Error("PDF zu groß (max 4 MB)");
  const base64 = await fileToBase64(file);
  const prompt =
    `Analysiere dieses Dokument und gib exakt dieses JSON zurück:\n` +
    `{\n` +
    `  "category": "eine von: versicherungen | sparplaene | leasing | bankkonten | steuerbelege",\n` +
    `  "fields": {\n` +
    `    /* versicherungen: name, anbieter, typ, beitrag, intervall, faelligkeit, policennummer, rueckkaufswert, monatsrenteJetzt, renteMit67Niedrig, renteMit67Hoch, renteGarantiert, notiz */\n` +
    `    /* sparplaene: name, anbieter, typ, beitrag, intervall, depot, isin, ticker, anteile, startdatum, depotwert, notiz */\n` +
    `    /* leasing: name, anbieter, typ, rate, intervall, laufzeit, restwert, faelligkeit, notiz */\n` +
    `    /* bankkonten: name, bank, typ, iban, kontonummer, kontostand, notiz */\n` +
    `    /* steuerbelege: datum (YYYY-MM-DD), betrag, mwst, netto7, netto19, kategorie, beschreibung, partner */\n` +
    `  },\n` +
    `  "documentName": "YYYY-MM-DD_[category]_[Anbieter]_[Dokumenttyp].pdf"\n` +
    `}\n` +
    `Alle Beträge in Euro. Keine Leerzeichen im documentName, Umlaute ersetzen. NUR JSON zurückgeben.`;
  const text = await callClaude(
    [{ role: "user", content: [buildFileContent(file, base64), { type: "text", text: prompt }] }],
    1536
  );
  const result = parseFirstJson(text);
  return {
    category: result.category || "",
    fields: result.fields || {},
    documentName: (result.documentName || "").trim().replace(/\s+/g, "_"),
  };
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
