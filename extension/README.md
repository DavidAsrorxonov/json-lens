# JSON Lens Extension

JSON Lens is a Chrome MV3 extension for inspecting JSON in two places:

- Direct JSON documents, including correctly labeled JSON and text responses
  that contain JSON.
- JSON network responses captured from a DevTools panel.

The extension renders parsed responses with a searchable tree viewer, raw view,
copy actions, parser warnings, large-payload limits, virtualized rendering, and
persisted viewer preferences.

## Development

Install dependencies from this directory:

```bash
npm install
```

Run the main checks:

```bash
npm run lint
npm run build
npm run test
npm run check:shared
```

Build output is written to `dist`. Load that folder through
`chrome://extensions` with Developer mode enabled.

## Extension Surfaces

- `src/content/json-detector.tsx` detects and replaces direct JSON documents.
- `src/devtools/devtools.ts` registers the JSON Lens DevTools panel.
- `src/panel/Panel.tsx` displays captured JSON network responses.
- `src/popup/Popup.tsx` edits persisted viewer preferences.
- `src/shared` contains parsing, JSON tree modeling, formatting, storage, and
  shared React viewer components.

## Permissions

- `storage` stores viewer preferences in `chrome.storage.local`.
- `<all_urls>` is needed so the content script can detect JSON documents across
  sites and so DevTools capture behavior works consistently during manual QA.

## Release Notes

Before a release candidate, run the command checks above and complete
`QA_CHECKLIST.md` against a freshly loaded `dist` folder in Chrome.
