export function checkFaelligkeiten(data) {
  const today = new Date();
  const warnungen = [];

  const categories = [
    { key: "versicherungen", label: "Versicherung" },
    { key: "leasing", label: "Leasing/Kredit" },
    { key: "sparplaene", label: "Sparplan" },
  ];

  for (const { key, label } of categories) {
    (data[key] || []).forEach((entry) => {
      const dateStr = entry.faelligkeit || entry.startdatum;
      if (!dateStr) return;
      const due = new Date(dateStr);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        warnungen.push({ entry, label, diffDays, dateStr });
      }
    });
  }

  return warnungen;
}

export function checkKuendigungsfristen(data) {
  const today = new Date();
  const warnungen = [];
  const cats = ["versicherungen", "leasing", "ausgaben"];

  for (const cat of cats) {
    (data[cat] || []).forEach((entry) => {
      if (!entry.kuendigungswecker || !entry.kuendigungsfrist) return;
      const frist = new Date(entry.kuendigungsfrist);
      const diffDays = Math.floor((frist - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        warnungen.push({ entry, cat, kuendigungsfrist: entry.kuendigungsfrist, diffDays });
      }
    });
  }

  return warnungen;
}
