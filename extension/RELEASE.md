# JSON Lens Release Notes

This file records the repeatable local release process for the unpacked Chrome
extension build.

## Build

From `extension/`:

```bash
npm run lint
npm run build
npm run test
npm run check:shared
```

The production extension artifact is `extension/dist`.

## Manual Browser QA

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `extension/dist`.
5. Complete `QA_CHECKLIST.md`.

Reload the extension from `chrome://extensions` after every rebuild. If behavior
looks stale, remove the unpacked extension entry and load `dist` again.

## Versioning

Keep these versions aligned before release:

- `manifest.config.ts` `version`
- `package.json` `version`
- `package-lock.json` root package version

## Release Readiness

A build is ready for manual distribution only when all automated checks pass and
the manual QA checklist has no unresolved failures.
