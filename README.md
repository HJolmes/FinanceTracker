# FinanceTracker

FinanceTracker ist eine private React-App zur Verwaltung persoenlicher Finanzdaten. Die App synchronisiert ihre Daten ueber OneDrive, laeuft als GitHub-Pages-PWA und nutzt optional einen Cloudflare Worker Proxy fuer Claude-basierte Dokumentverarbeitung.

## Features

- Microsoft Login ueber MSAL
- OneDrive-Sync fuer `data.json` und hochgeladene Dokumente
- Dashboard fuer Einnahmen, Ausgaben, Saldo und Vermoegensverlauf
- Kategorien fuer Versicherungen, Sparplaene, Leasing/Kredite, Bankkonten, Steuerbelege, Einnahmen und Ausgaben
- KI-gestuetzte Extraktion von PDF- und Bilddokumenten
- KI-gestuetzte Kuendigungsschreiben
- Cashflow-Ansicht, Kalender/Faelligkeiten, Suche, Steuerbeleg-Export und CSV/XLSX-Import

## Lokales Setup

```powershell
npm install --legacy-peer-deps
npm start
```

Fuer lokale KI-Funktionen muss das Frontend diese Variablen kennen:

```powershell
$env:REACT_APP_AI_PROXY_URL="http://localhost:8787"
$env:REACT_APP_AI_PROXY_SECRET="<dein-shared-app-secret>"
npm start
```

## Cloudflare Worker Proxy

Der Claude API-Key wird nicht im Browser gespeichert. Stattdessen ruft das Frontend den Worker auf, und der Worker ruft Anthropic mit seinem serverseitigen Secret auf.

Worker lokal starten:

```powershell
Copy-Item worker/.dev.vars.example worker/.dev.vars
# worker/.dev.vars mit echten Werten fuellen
npm run worker:dev
```

Worker deployen:

```powershell
npx wrangler login
npm run worker:deploy
```

Secrets per Wrangler setzen:

```powershell
cd worker
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put FINANCETRACKER_PROXY_SECRET
```

Alternativ im Cloudflare Dashboard:

1. Workers & Pages oeffnen.
2. Worker `financetracker-ai-proxy` auswaehlen.
3. Settings > Variables and Secrets oeffnen.
4. `ANTHROPIC_API_KEY` als Secret anlegen.
5. `FINANCETRACKER_PROXY_SECRET` als Secret anlegen.
6. Speichern/deployen.

`FINANCETRACKER_PROXY_SECRET` kann lokal in PowerShell erzeugt werden:

```powershell
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

## GitHub Pages Deployment

Der Workflow `.github/workflows/deploy.yml` baut die App fuer GitHub Pages. In GitHub muessen unter Settings > Secrets and variables > Actions diese Secrets gesetzt werden:

- `REACT_APP_AI_PROXY_URL`: die Worker-URL, z.B. `https://financetracker-ai-proxy.<dein-subdomain>.workers.dev`
- `REACT_APP_AI_PROXY_SECRET`: derselbe Wert wie `FINANCETRACKER_PROXY_SECRET`

Der Cloudflare Worker wird ueber `.github/workflows/deploy-worker.yml` deployed. Dafuer muessen zusaetzlich diese Secrets gesetzt sein:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Versionierung

Bei jeder fachlichen oder codebezogenen Aenderung, die auf `main` deployed werden soll, muessen `APP_VERSION` und `APP_CHANGELOG` in `src/version.js` erhoeht werden. Das aktuelle Schema ist `beta v0.xxx`; pro Release wird um `0.001` erhoeht.

## Sicherheitshinweise

- Der Anthropic API-Key gehoert nur in Cloudflare Secrets, nie in das Frontend oder in Git.
- `REACT_APP_AI_PROXY_SECRET` ist ein App-Token im Browser-Bundle. Es ist ein pragmatischer Schutz gegen zufaellige Fremdnutzung, aber kein echtes Geheimnis.
- CORS im Worker erlaubt GitHub Pages und lokale Dev-Origins.
- Fuer staerkere Absicherung sollte spaeter Microsoft-Entra/MSAL-Token-Validierung im Worker ergaenzt werden.
- Dokumentinhalte werden fuer KI-Funktionen an Anthropic gesendet.

## Bekannte Grenzen

- Steuer- und Gehaltsberechnungen sind Naeherungswerte und keine steuerliche Beratung.
- Die KI-Funktionen haengen vom Cloudflare Worker, Anthropic-Verfuegbarkeit und dem gesetzten Proxy-Secret ab.
- Create React App ist weiterhin im Einsatz; eine spaetere Vite-Migration ist sinnvoll, aber nicht Teil dieses Sicherheitsumbaus.
