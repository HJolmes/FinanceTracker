# FinanceTracker Agent Guide

These rules apply to Claude Code, Codex, and human contributors working in this repository.

## Product Rules

- Extend existing flows instead of adding parallel buttons, pages, or duplicate workflows.
- If a feature already exists under a tab, modal, service, or workflow, improve that implementation in place.
- Keep maintenance simple: centralize shared validation, export, sync, and AI logic instead of copying it.
- Do not add special-case UI for a single category when the existing category/form flow can support it.

## Versioning

- At the start of every work session, read `src/version.js` once to understand the current version and changelog.
- Changelogs are mandatory for deployable changes. Keep `APP_CHANGELOG` current and user-readable.
- For every functional or code-related change intended for `main`, update `src/version.js`.
- Increment the current `beta v0.xxx` version by `0.001`.
- Add an `APP_CHANGELOG` entry explaining the user-visible change.
- Documentation-only changes may skip the app version unless they affect setup, deployment, or agent workflow.

## Checks Before PR

Run these before opening or merging a PR:

```powershell
npm.cmd run build
node --check worker\src\index.js
```

If the Worker was changed, also review `worker/wrangler.toml` and keep secrets out of committed files.

## Security

- Never commit real secrets, API keys, tokens, `.env`, or `worker/.dev.vars`.
- The Anthropic key belongs only in Cloudflare Worker Secrets.
- `REACT_APP_AI_PROXY_SECRET` is an app token exposed to the browser bundle; do not treat it as a strong secret.
- Financial documents and receipts may contain private data. Avoid logging file contents or extracted personal data.

## Architecture Notes

- Frontend is React via Create React App.
- `src/components` contains UI flows.
- `src/services` contains shared sync, import/export, search, salary, market, and AI client logic.
- `worker/src/index.js` proxies AI calls to Anthropic.
- OneDrive stores `data.json` and uploaded documents.
- GitHub Pages deploys the frontend; Cloudflare Workers deploys the AI proxy.

## GitHub Workflow

- Prefer PRs over direct pushes to `main`.
- Keep PRs focused and describe which existing flow was extended.
- CI must pass before merge.
- Recommended branch protection for `main`:
  - require pull request before merging
  - require status check `CI`
  - optionally block direct pushes
