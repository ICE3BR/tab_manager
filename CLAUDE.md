# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tab Manager Lite — a lightweight Chrome/Chromium extension (Manifest V3) for managing browser tabs: search, sort, close, group by window, find duplicates (by site or by exact URL), save/restore sessions, pin/mute/discard tabs, merge windows, and a keyboard shortcut to auto-close exact-URL duplicates.

No build step: plain JavaScript with native ES modules, loaded directly by the browser. No framework, no bundler, no npm runtime dependencies — this is a deliberate choice to keep the extension small; don't introduce a build pipeline or UI framework without discussing it first.

## Commands

```bash
npm test              # run the test suite (node:test, zero dependencies)
npm run test:coverage # run with coverage report (--experimental-test-coverage)
```

- Run a single test file: `node --test src/duplicates.test.js`
- There is no lint/typecheck/build command configured.
- To manually verify in the browser: open `chrome://extensions`, enable "Modo do desenvolvedor", "Carregar sem pacote", select this folder. Reload the extension there after any change to pick it up.

## Architecture

**Two entry points, no shared runtime state between them:**
- `popup.html`/`popup.js` — the toolbar popup UI. Owns all UI state (`src/state.js`) and orchestrates the `src/*` modules. Re-fetches tabs on every relevant `chrome.tabs.on*` event rather than keeping a persistent connection to the background worker.
- `background.js` — an MV3 service worker (`"type": "module"` in `manifest.json`, required so it can `import` from `src/`). Keeps the toolbar badge showing the total open-tab count, and handles the `close-duplicate-tabs` keyboard command independently of whether the popup is open.

**`src/` is the testable core, deliberately decoupled from the DOM:**
- `tabs.js` — wraps `chrome.tabs.query`, normalizes Chrome's tab shape into `{id, windowId, title, url, favIconUrl, active, pinned, muted, discarded, index}`.
- `duplicates.js` — groups tabs by hostname (`groupBySite`) or by exact normalized URL (`groupByExactUrl`); the exact-URL mode is the feature this project adds beyond stock tab-duplicate-finders. `computeAutoCloseIds`/`idsToCloseKeepingOne` decide which duplicate to keep (always the highest tab id = most recently opened).
- `actions.js` — thin wrappers over `chrome.tabs` (close, focus, pin, mute, discard). `discardTab` returns `true`/`false` because `chrome.tabs.discard()` silently no-ops on the active tab instead of throwing — callers must check the return value to give the user real feedback.
- `windows.js` — `computeMergePlan` is a pure function (window/tab list in, moves out) covered directly by unit tests; `mergeAllWindowsInto` is the thin async wrapper that executes it via `chrome.tabs.move`.
- `sessions.js` — save/list/delete/restore named tab snapshots in `chrome.storage.local` (key `tabManagerLiteSessions`).
- `state.js` — in-memory UI state (query, sort, view, duplicate mode, selection) plus persisted prefs (key `tabManagerLitePrefs`).
- `render.js` — pure string-building DOM rendering (`render`, `renderSessionsView`, `renderFooter`). Takes tabs/sessions/state in, writes `innerHTML` out; holds no state itself.

**Why the split matters for testing:** every module under `src/` except `render.js` is designed to run under plain Node with `chrome.*` replaced by the mock in `src/test-helpers/chromeMock.js` — no browser or DOM needed. `render.js`, `popup.js`, and `background.js` are the DOM/orchestration layer and are *not* unit tested (would require adding a DOM dependency like jsdom, which conflicts with the no-build-step decision); they're validated manually in the browser. See `docs/testing/fase-2.tdd.md` for the reasoning and the RED/GREEN history of the current test suite.

**Event delegation pattern in `popup.js`:** all list interactions (row click to focus, checkbox, pin/mute/discard/close buttons, session restore/delete) go through a single `click` listener on `#list` that dispatches on `.closest()` class matches — there's no per-row listener attaching. When adding a new row-level action, add a new branch there and a matching class/data attribute in `render.js`'s row HTML.

## Known gotchas

- `.duplicate-mode-bar`/`#sessionBar` visibility is toggled via the `hidden` attribute in JS, not a CSS class — if you add `display` to a rule matching those elements, add a `[hidden] { display: none }` override too, or the attribute gets silently overridden (this exact bug happened once; see git history).
- The `close-duplicate-tabs` keyboard shortcut (`Ctrl+Shift+D`) collides with Chrome/Brave's built-in "bookmark all tabs" shortcut. This is a known, intentionally unfixed limitation — don't "fix" it by silently changing the suggested key without checking with the user first.
- `chrome.tabs.discard()` cannot discard the currently active tab — this is real browser behavior, not a bug to route around silently; the UI already reflects it (disabled button + tooltip).
