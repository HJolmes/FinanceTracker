## Summary

- 

## Existing Flow Extended

- Which existing screen, modal, service, or workflow did this change extend?
- Confirm no duplicate button/page/workflow was added unless explicitly required:

## Version / Changelog

- [ ] `src/version.js` version was incremented for a deployable code change
- [ ] `APP_CHANGELOG` includes the change
- [ ] Version bump intentionally skipped because this is docs-only or non-deployable

## Validation

- [ ] `npm.cmd run build`
- [ ] `node --check worker\src\index.js`
- [ ] Mobile flow checked when navigation or layout changed
- [ ] Desktop flow checked when navigation or layout changed

## Security / Secrets

- [ ] No real secrets, keys, tokens, `.env`, or `worker/.dev.vars` committed
- [ ] Worker/AI changes keep Anthropic API access server-side
- [ ] Financial or receipt data is not logged unnecessarily
