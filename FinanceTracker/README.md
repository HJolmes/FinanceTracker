# FinanceTracker 💰

Persönlicher Finanz- & Versicherungsmanager als Progressive Web App (PWA).

## Features

- 🛡️ Versicherungen verwalten (Kranken, Haftpflicht, Leben, Rente, KFZ etc.)
- 📈 Sparpläne & ETFs tracken
- 🚗 Leasing & Kredite im Blick
- 🏦 Bankkonten verwalten
- 📄 Dokumente (PDFs) direkt in OneDrive speichern
- 📊 Dashboard mit Kostenübersicht & Charts
- ☁️ Automatischer Sync mit Microsoft OneDrive
- 📱 Als PWA auf dem Handy installierbar (Vollbild)

## Setup

### 1. Repository klonen

```bash
git clone https://github.com/HJolmes/FinanceTracker.git
cd FinanceTracker
npm install
```

### 2. GitHub Pages aktivieren

GitHub → Repository → Settings → Pages → Source: **gh-pages branch**

### 3. App lokal testen

```bash
npm start
```

### 4. Auf GitHub deployen

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

Der GitHub Actions Workflow deployed automatisch auf: https://HJolmes.github.io/FinanceTracker/

### 5. Als PWA auf dem Handy installieren

1. https://HJolmes.github.io/FinanceTracker/ im Browser öffnen
2. Mit Microsoft-Konto anmelden
3. iOS: Teilen → „Zum Home-Bildschirm" | Android: Menü → „App installieren"

## Technologie

- React 18
- Microsoft MSAL (Authentifizierung)
- Microsoft Graph API (OneDrive-Sync)
- Recharts (Diagramme)
- GitHub Pages (Hosting)
- GitHub Actions (Auto-Deploy)
