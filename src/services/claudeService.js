// src/services/claudeService.js
const CLAUDE_KEY = "financetracker_claude_key";

export function getClaudeApiKey() {
  return localStorage.getItem(CLAUDE_KEY) || "";
}

export function saveClaudeApiKey(key) {
  if (key.trim()) localStorage.setItem(CLAUDE_KEY, key.trim());
  else localStorage.removeItem(CLAUDE_KEY);
}

export async function mapTextToFields(text, category, fields) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("NO_KEY");

  const fieldList = fields
    .filter((f) => !["dokument", "notiz"].includes(f))
    .join(", ");

  const prompt = `Du bist Experte für deutsche Finanzdokumente (${getCategoryName(category)}).
Hier ist der per OCR extrahierte Text:

${text.slice(0, 4000)}

Extrahiere exakt diese Felder soweit erkennbar: ${fieldList}
Antworte NUR mit einem JSON-Objekt, keine Erklärung.
Regeln:
- Zahlen ohne Währungszeichen, Punkt als Dezimaltrennzeichen (z.B. 45.90)
- Datumsfelder als YYYY-MM-DD
- Nur Felder die du sicher erkannt hast
Beispiel: {"name":"Allianz Haftpflicht","beitrag":"8.90","anbieter":"Allianz"}`;

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
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const responseText = data.content?.[0]?.text || "";
  const match = responseText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Keine Felder erkannt");
  return JSON.parse(match[0]);
}

function getCategoryName(category) {
  const names = {
    versicherungen: "Versicherungsvertrag",
    sparplaene: "Sparplan / ETF",
    leasing: "Leasing- oder Kreditvertrag",
    bankkonten: "Bankdokument",
    kredite: "Kreditvertrag",
  };
  return names[category] || "Finanzdokument";
}
