const CATEGORIES = ["versicherungen", "sparplaene", "leasing", "bankkonten", "steuerbelege", "einnahmen"];

export function search(query, data) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = [];

  for (const category of CATEGORIES) {
    const entries = data[category] || [];
    for (const entry of entries) {
      for (const [field, value] of Object.entries(entry)) {
        if (typeof value === "string" && value.toLowerCase().includes(q)) {
          results.push({ category, entry, matchedField: field });
          break;
        }
      }
    }
  }

  return results;
}
