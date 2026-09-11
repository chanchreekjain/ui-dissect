# UI Dissect test suite

Browser-driven regression tests. They run the real content-script bundle from
`dist/`, so **build first**:

```bash
npm run build
npm install --no-save playwright   # or use an existing Playwright install
```

| Suite | What it covers |
|---|---|
| `edit-pane.spec.mjs` | Freeze, Edit tab, live colour/radius edits, `!important` priority, WCAG ratio maths, exact reset, gradient "not measurable" case, keyboard capture while a slider is focused |
| `controls.spec.mjs` | Alpha, border, shadow and font-size controls, gradient clearing, Reset all across elements, Tailwind and React exports |
| `extension.spec.mjs` | Loads `dist/` as a real unpacked MV3 extension: service worker registration, hotkey, HUD, live edit, popup |

```bash
node test/edit-pane.spec.mjs
node test/controls.spec.mjs

# extension.spec.mjs needs the fixture served over http, not file://
python -m http.server 8099 &
node test/extension.spec.mjs
```

Set `CHROMIUM_PATH` to use a specific Chromium binary, and `FIXTURE_URL` to
point the extension suite at a different host or port.

Contrast expectations are pinned to hand-checked WCAG 2.1 values
(`#bbbbbb` on `#ffffff` is exactly 1.92:1), so a regression in the colour maths
fails rather than sliding through on a loose tolerance.
