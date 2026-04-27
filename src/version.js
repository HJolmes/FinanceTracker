export const APP_VERSION = "beta v0.005";
export const APP_CHANGELOG = {
  "beta v0.005": {
    date: "27.04.2026",
    entries: [
      { emoji: "📒", title: "Changelog-Regel geschaerft", desc: "Agents muessen den Changelog pro Session lesen und bei deploybaren Aenderungen fortschreiben." }
    ]
  },
  "beta v0.004": {
    date: "27.04.2026",
    entries: [
      { emoji: "🤖", title: "Agent-Regeln ergaenzt", desc: "Claude Code und Codex bekommen klare Repo-Regeln gegen doppelte Funktionen und fuer einfache Wartung." },
      { emoji: "✅", title: "PR-CI eingefuehrt", desc: "Pull Requests pruefen jetzt Frontend-Build und Worker-Syntax." },
      { emoji: "📋", title: "Templates hinzugefuegt", desc: "PR- und Issue-Templates fuehren neue Arbeiten durch bestehende Flows." }
    ]
  },
  "beta v0.003": {
    date: "27.04.2026",
    entries: [
      { emoji: "🧭", title: "Mobile Navigation verbessert", desc: "Steuerbelege und weitere Bereiche sind auf dem Handy jetzt ueber Mehr erreichbar." }
    ]
  },
  "beta v0.002": {
    date: "27.04.2026",
    entries: [
      { emoji: "🔐", title: "KI-Proxy abgesichert", desc: "Claude-Anfragen laufen jetzt ueber einen Cloudflare Worker statt mit API-Key im Browser." },
      { emoji: "🚀", title: "Worker-Deployment", desc: "Der Cloudflare Worker kann ueber GitHub Actions deployed werden." },
      { emoji: "📘", title: "Setup dokumentiert", desc: "README mit Cloudflare-Secrets, GitHub-Secrets und Versionsregel ergaenzt." }
    ]
  },
  "beta v0.001": {
    date: "26.04.2026",
    entries: [
      { emoji: "🚀", title: "Erster Release", desc: "Vollständiger Neuaufbau der App." }
    ]
  }
};
