# JSON Lens Manual QA Checklist

Use a fresh production build from `npm run build`, then load `extension/dist` in
Chrome through `chrome://extensions`.

## Install And Reload

- [ ] Extension loads without Chrome manifest errors.
- [ ] Extension reloads cleanly after rebuilding `dist`.
- [ ] Popup opens from the toolbar action.
- [ ] JSON Lens appears as a DevTools panel.

## Direct JSON Documents

- [ ] Open `https://jsonplaceholder.typicode.com/users`.
- [ ] JSON Lens replaces the browser raw response with the viewer.
- [ ] Tree mode expands objects and arrays at the configured default depth.
- [ ] Raw mode scrolls vertically and horizontally for long documents.
- [ ] Search works in tree mode for keys, values, and paths.
- [ ] Search works in raw mode and highlights the active match.
- [ ] Previous and next match controls move the active match.
- [ ] Copy raw writes the full raw response and shows temporary feedback.
- [ ] Top-level primitive JSON renders with a parser warning.
- [ ] Invalid JSON displays a parse error instead of an empty viewer.

## DevTools Network Capture

- [ ] Open DevTools before triggering requests.
- [ ] Reload or trigger requests on a page with JSON API calls.
- [ ] JSON responses appear in the request sidebar.
- [ ] Mislabeled text responses containing JSON are captured.
- [ ] Non-JSON responses are ignored.
- [ ] Selecting a request keeps the response detail and tree in sync.
- [ ] Search works on the selected parsed response.
- [ ] Copy path and copy value write the expected data and show feedback.
- [ ] Clear requests empties the sidebar and viewer state.
- [ ] Response body read errors display in the warning banner and can be
  dismissed.

## Viewer Preferences

- [ ] Change each popup setting: expanded depth, string preview, rendered rows,
  and virtualize above.
- [ ] Settings persist after closing and reopening the popup.
- [ ] Direct JSON documents use the updated settings.
- [ ] DevTools panel responses use the updated settings.
- [ ] Reset defaults restores the documented default values.

## Large Payload Behavior

- [ ] Long strings are truncated in tree mode at the configured preview length.
- [ ] Very large tree output shows the render-limit warning.
- [ ] Loading the full tree works when intentionally requested.
- [ ] Responses above the automatic parse limit display the large-payload error
  with both actual size and limit.

## Release Gate

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test` passes.
- [ ] `npm run check:shared` passes.
- [ ] No unused scaffold pages or assets are present in `dist`.
