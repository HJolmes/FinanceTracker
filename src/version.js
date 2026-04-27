export const APP_VERSION = "beta v0.003";
export const APP_CHANGELOG = {
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
