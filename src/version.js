export const APP_VERSION = "beta v0.015";

export const APP_CHANGELOG = {
  "beta v0.015": {
    date: "26.04.2026",
    entries: [
      {
        emoji: "🧹",
        title: "Code-Bereinigung",
        desc: "Tote Exports entfernt (graphConfig, getGeburtsjahr, getTransactions, mapTextToFields, mapPDFToFields) – kein toter Code mehr im Projekt.",
      },
    ],
  },
  "beta v0.014": {
    date: "26.04.2026",
    entries: [
      {
        emoji: "🎯",
        title: "Ticker-Suche via OpenFIGI (Bloomberg)",
        desc: "ISIN-zu-Ticker wird jetzt über die OpenFIGI-API von Bloomberg aufgelöst – deutlich zuverlässiger als Yahoo Finance Search, kein CORS-Problem auf Mobilgeräten.",
      },
      {
        emoji: "☁️",
        title: "\"Aus OneDrive laden\" Button",
        desc: "In den Einstellungen gibt es jetzt einen Button um Daten manuell aus OneDrive neu zu laden – wichtig nach Pfadänderungen oder App-Reset.",
      },
      {
        emoji: "📍",
        title: "Aktiver OneDrive-Pfad sichtbar",
        desc: "Die Einstellungen zeigen jetzt den tatsächlich verwendeten Pfad an, damit Pfad-Fehler sofort erkannt werden können.",
      },
      {
        emoji: "🔧",
        title: "OneDrive Fallback verbessert",
        desc: "Bei nicht gefundener Datei (404) wird jetzt zuerst der lokale Cache geprüft, statt sofort leere Daten zurückzugeben.",
      },
    ],
  },
  "beta v0.013": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "🔄",
        title: "App-Update-Banner",
        desc: "Sobald eine neue Version bereitsteht, erscheint oben ein Banner mit \"Jetzt aktualisieren\" – ein Tipp genügt.",
      },
      {
        emoji: "⚙️",
        title: "\"App aktualisieren\" in Einstellungen",
        desc: "In den Einstellungen gibt es jetzt einen Button, der Cache und Service Worker zurücksetzte und die neueste Version lädt.",
      },
    ],
  },
  "beta v0.012": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "🧠",
        title: "Ticker automatisch erkannt",
        desc: "ISIN eingeben genügt – der Börsenticker wird automatisch über Yahoo Finance gesucht.",
      },
      {
        emoji: "🔧",
        title: "\"Failed to fetch\" behoben",
        desc: "Yahoo Finance API nutzt jetzt query2 als Fallback wenn query1 blockiert wird.",
      },
    ],
  },
  "beta v0.011": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "📈",
        title: "Echte Kursverläufe für ETF & Spar Pläne",
        desc: "ETF- und Fonds-Einträge zeigen den realen Kursverlauf – 1M, 3M, 6M, 1J, 5J wählbar.",
      },
      {
        emoji: "💰",
        title: "Depotwert live berechnet",
        desc: "Anteilszahl eingeben → Depotwert wird automatisch aus dem aktuellen Kurs berechnet.",
      },
    ],
  },
  "beta v0.010": {
    date: "25.04.2026",
    entries: [
      { emoji: "🗑️", title: "Dokumente einzeln löschen", desc: "Falsch zugeordnete Dokumente direkt aus der Karte entfernen." },
      { emoji: "🔄", title: "Neu bewerten pro Dokument", desc: "KI liest Felder aus einer neuen Datei neu aus." },
      { emoji: "🧧", title: "Bewirtungsbeleg MwSt-Aufschlüsselung", desc: "Speisen (7%) und Getränke (19%) separat erfassen." },
      { emoji: "⚠️", title: "Pflichtfeld-Warnung bei Bewirtung", desc: "Hinweis wenn Anlass oder Teilnehmer fehlen." },
    ],
  },
};
