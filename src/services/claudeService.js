const MAX_PDF_BYTES = 4 * 1024 * 1024;

const AI_PROXY_URL = (process.env.REACT_APP_AI_PROXY_URL || "").replace(/\/+$/, "");
const AI_PROXY_SECRET = process.env.REACT_APP_AI_PROXY_SECRET || "";

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

async function callAiProxy(endpoint, messages, maxTokens = 1024) {
  if (!hasAiProxyConfig()) {
    throw new Error("KI-Proxy nicht konfiguriert. Bitte REACT_APP_AI_PROXY_URL und REACT_APP_AI_PROXY_SECRET setzen.");
  }

  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1));

    const res = await fetch(`${AI_PROXY_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-financetracker-secret": AI_PROXY_SECRET,
      },
      body: JSON.stringify({ messages, maxTokens }),
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {}

    if (res.status === 429) {
      lastError = new Error(payload?.error || "KI-Proxy 429 - Rate limit, bitte kurz warten");
      continue;
    }
    if (!res.ok) {
      throw new Error(payload?.error || `KI-Proxy ${res.status}`);
    }
    if (!payload?.text) throw new Error("KI-Proxy hat keine Textantwort geliefert");
    return payload.text;
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
      "name, betrag (Nettobetrag), bruttoGehalt, steuerklasse (Zahl 1-6), lohnsteuer, bav (bAV-Beitrag EUR/Monat), sachbezug (geldwerter Vorteil EUR/Monat), kirchensteuer (true/false), kinderlos (true/false), intervall, kategorie",
    ausgaben:
      "name, anbieter, typ, betrag, intervall, faelligkeit (YYYY-MM-DD), email (Kontakt-E-Mail), notiz",
  };
  return fields[category] || "name, betrag, notiz";
}

export async function generateKuendigungsschreiben(entry, category) {
  const details = JSON.stringify(entry, null, 2);
  const prompt =
    `Du bist ein deutscher Rechtsassistent. Erstelle ein rechtssicheres Kuendigungsschreiben fuer folgenden Vertrag:\n\n${details}\n\n` +
    `Antworte NUR mit folgendem JSON:\n` +
    `{\n` +
    `  "brief": "vollstaendiger Brieftext mit Betreff, Anrede, Kuendigung, Bitte um Bestaetigung, Gruesse",\n` +
    `  "email": "kuendigung@anbieter.de oder null wenn keine E-Mail-Kuendigung moeglich",\n` +
    `  "anleitung": ["Schritt 1: ...", "Schritt 2: ..."] oder null wenn E-Mail ausreicht\n` +
    `}\n\n` +
    `Hinweise:\n` +
    `- Nutze bekannte Kuendigungs-E-Mail-Adressen grosser Anbieter (z.B. Spotify, Netflix, Fitnessstudios, Telekommunikation)\n` +
    `- Wenn der Anbieter keine E-Mail-Kuendigung akzeptiert, setze email auf null und gib eine Schritt-fuer-Schritt-Anleitung\n` +
    `- Der Brief soll professionell, hoeflich und rechtlich korrekt sein\n` +
    `- Fuege "fristgerecht" und "zum naechstmoeglichen Termin" ein\n` +
    `- NUR JSON zurueckgeben, keine Erklaerungen ausserhalb des JSON`;
  const text = await callAiProxy("/api/generate-cancellation", [{ role: "user", content: [{ type: "text", text: prompt }] }], 2048);
  return parseFirstJson(text);
}

function buildFileContent(file, base64) {
  if (file.type && file.type.startsWith("image/")) {
    return { type: "image", source: { type: "base64", media_type: file.type, data: base64 } };
  }
  return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
}

export async function extractAndName(file, category) {
  if (!file.type?.startsWith("image/") && file.size > MAX_PDF_BYTES) throw new Error("PDF zu gross (max 4 MB)");
  const base64 = await fileToBase64(file);
  const steuerExtra = category === "steuerbelege"
    ? "Extrahiere auch den 7%/19% MwSt-Split (netto7, netto19). Felder 'teilnehmer' und 'zweck' NICHT extrahieren. "
    : "";
  const prompt =
    `Analysiere dieses Dokument und gib exakt dieses JSON zurueck:\n` +
    `{\n` +
    `  "fields": { /* Felder fuer Kategorie "${category}": ${categoryFieldsPrompt(category)}. ${steuerExtra}Alle Betraege in Euro. */ },\n` +
    `  "documentName": "YYYY-MM-DD_${category}_[Anbieter]_[Dokumenttyp].pdf"\n` +
    `}\n` +
    `Keine Leerzeichen im documentName, Umlaute ersetzen (ae/oe/ue/ss). NUR JSON zurueckgeben.`;
  const text = await callAiProxy(
    "/api/extract-and-name",
    [{ role: "user", content: [buildFileContent(file, base64), { type: "text", text: prompt }] }],
    1536
  );
  const result = parseFirstJson(text);
  return {
    fields: result.fields || {},
    documentName: (result.documentName || "").trim().replace(/\s+/g, "_"),
  };
}

export async function detectAndExtract(file) {
  if (!file.type?.startsWith("image/") && file.size > MAX_PDF_BYTES) throw new Error("PDF zu gross (max 4 MB)");
  const base64 = await fileToBase64(file);
  const prompt =
    `Analysiere dieses Dokument und gib exakt dieses JSON zurueck:\n` +
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
    `Alle Betraege in Euro. Keine Leerzeichen im documentName, Umlaute ersetzen. NUR JSON zurueckgeben.`;
  const text = await callAiProxy(
    "/api/detect-and-extract",
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
  return extractAndName(file, category).then((result) => result.fields);
}

export async function extractFromImage(file, category) {
  return extractAndName(file, category).then((result) => result.fields);
}

export async function buildDocumentName(file, category) {
  const result = await extractAndName(file, category);
  return result.documentName;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function hasAiProxyConfig() {
  return Boolean(AI_PROXY_URL && AI_PROXY_SECRET);
}
