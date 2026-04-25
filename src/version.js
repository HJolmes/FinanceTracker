export const APP_VERSION = "beta v0.012";

export const APP_CHANGELOG = {
  "beta v0.012": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "🧠",
        title: "Ticker automatisch erkannt",
        desc: "ISIN eingeben genügt – der Börsenticker wird automatisch über Yahoo Finance gesucht. Kein manuelles Eintippen mehr nötig.",
      },
      {
        emoji: "🔍",
        title: "Kursverlauf ohne Ticker",
        desc: "ETF-Einträge ohne Ticker zeigen trotzdem den Kursverlauf – die App sucht den Ticker selbständig anhand von ISIN oder Name.",
      },
      {
        emoji: "🔧",
        title: "\"Failed to fetch\" behoben",
        desc: "Yahoo Finance API nutzt jetzt query2 als Fallback wenn query1 blockiert wird – Kursdaten laden zuverlässiger auf Mobilgeräten.",
      },
    ],
  },
  "beta v0.011": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "📈",
        title: "Echte Kursverläufe für ETF & Spar Pläne",
        desc: "ETF- und Fonds-Einträge zeigen jetzt den realen Kursverlauf direkt in der Karte – 1M, 3M, 6M, 1J oder 5J wählbar.",
      },
      {
        emoji: "💰",
        title: "Depotwert live berechnet",
        desc: "Trägst du deine Anteilszahl ein, berechnet die App den aktuellen Depotwert automatisch aus dem Yahoo Finance Kurs.",
      },
      {
        emoji: "🏷️",
        title: "Ticker-Feld für Spar Pläne",
        desc: "Neues Feld 'Börsen-Ticker' und 'Anteile im Besitz' in Spar Plänen – unterstützt ETFs, Fonds und Aktienpläne.",
      },
    ],
  },
  "beta v0.010": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "🗑️",
        title: "Dokumente einzeln löschen",
        desc: "Falsch zugeordnete Dokumente können jetzt direkt aus der Policen-Karte entfernt werden, ohne den ganzen Eintrag zu bearbeiten.",
      },
      {
        emoji: "🔄",
        title: "Neu bewerten pro Dokument",
        desc: "Neben jedem Dokument im Bearbeitungsformular gibt es jetzt einen ‘Neu bewerten’-Button: Datei auswählen und die KI liest alle Felder neu aus.",
      },
      {
        emoji: "🧧",
        title: "Bewirtungsbeleg: MwSt-Aufschlüsselung",
        desc: "Speisen (7%) und Getränke (19%) werden als separate Nettobetrage erfasst und auf dem Beleg angezeigt.",
      },
      {
        emoji: "✍️",
        title: "Handschrift-Erkennung für Bewirtungsbelege",
        desc: "Claude erkennt jetzt handschriftlich ergänzte Teilnehmer und den geschäftlichen Anlass direkt auf dem Foto des Belegs.",
      },
      {
        emoji: "⚠️",
        title: "Pflichtfeld-Warnung bei Bewirtung",
        desc: "Fehlen Anlass oder Teilnehmer, erscheint ein Hinweis direkt auf dem Beleg – damit steuerl. Pflichtangaben nicht vergessen werden.",
      },
    ],
  },
  "beta v0.009": {
    date: "25.04.2026",
    entries: [
      {
        emoji: "📈",
        title: "Renten-Spanne (pessimistisch – optimistisch)",
        desc: "Bei Rentenversicherungen mit fondsgebundenen Anlagen zeigt die App jetzt eine Bandbreite: niedrigstes bis höchstes Szenario aus der Standmitteilung.",
      },
      {
        emoji: "✅",
        title: "Garantierte Rente aus Rentenbescheid",
        desc: "Liegt ein konkreter Rentenbescheid vor, wird die garantierte Monatsrente separat ausgewiesen – unterschieden von Prognosen.",
      },
      {
        emoji: "🔍",
        title: "Update-Reminder verbessert",
        desc: "Frisch hochgeladene Dokumente lösen in den ersten 7 Tagen keine Überfällig-Warnung mehr aus.",
      },
      {
        emoji: "🔔",
        title: "Update-Zusammenfassung (Was ist neu?)",
        desc: "Nach jedem App-Update erscheint automatisch eine Übersicht der Änderungen. In den Einstellungen jederzeit erneut aufrufbar.",
      },
    ],
  },
  "beta v0.008": {
    date: "25.04.2026",
    entries: [
      { emoji: "📱", title: "PWA – Als App installierbar", desc: "FinanceTracker kann auf Android als Vollbild-App installiert werden." },
      { emoji: "🖥️", title: "Desktop-Layout mit Sidebar", desc: "Ab 768 px wechselt die App auf Sidebar-Navigation." },
      { emoji: "🧧", title: "Steuerbelege-Tab", desc: "KI-Erkennung per Foto/PDF, Jahresübersicht und Kategorien." },
      { emoji: "📅", title: "Dokument-Update-Reminder", desc: "Versicherungen zeigen Hinweis wenn neues Dokument fällig ist." },
    ],
  },
};
