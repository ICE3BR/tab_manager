# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tab Manager Lite — a lightweight Chrome/Chromium extension (Manifest V3), built as a modern, from-scratch alternative to "Tab Manager Plus for Chrome" (stefanXO). Core tools: search/sort/close tabs grouped by window, duplicate detection by site *or* by exact URL (the exact-URL mode is this project's original addition beyond Tab Manager Plus), saved sessions with JSON export/import, pin/mute/discard, window merging, a full Options page, and bulk actions on multi-selected tabs.

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

**Three entry points, no shared runtime state between them:**
- `popup.html`/`popup.js` — the toolbar popup UI (also reachable as a full tab via "abrir em aba própria" — same files, `?tab=true` in the URL toggles the layout). Owns all UI state (`src/state.js`) and orchestrates the `src/*` modules. Re-fetches tabs on every relevant `chrome.tabs.on*` event rather than keeping a persistent connection to the background worker.
- `options.html`/`options.js` — the full Options page (`manifest.json`'s `options_ui`, opens in its own tab). Reads/writes the same `tabManagerLitePrefs` via `state.js`'s `loadPrefs`/`savePrefs` — there is no separate options data model.
- `background.js` — an MV3 service worker (`"type": "module"` in `manifest.json`, required so it can `import` from `src/`). Keeps the toolbar badge in sync, enforces the tab-limit-per-window setting, builds the icon's right-click context menu, and handles the `close-duplicate-tabs` keyboard command independently of whether the popup is open. **Never caches prefs across events** — see Known Gotchas.

**`src/` is the testable core, deliberately decoupled from the DOM:**
- `tabs.js` — wraps `chrome.tabs.query`, normalizes Chrome's tab shape into `{id, windowId, title, url, favIconUrl, active, pinned, muted, discarded, index}`.
- `duplicates.js` — groups tabs by hostname (`groupBySite`) or by exact normalized URL (`groupByExactUrl`). `computeAutoCloseIds`/`idsToCloseKeepingOne` decide which duplicate to keep (always the highest tab id = most recently opened) for the keyboard-shortcut auto-close.
- `actions.js` — thin wrappers over `chrome.tabs` (close, focus, pin, mute, discard) plus their `bulk*` counterparts (`bulkPin`, `bulkMute`, `bulkDiscard`) for multi-selected tabs. `discardTab` returns `true`/`false` because `chrome.tabs.discard()` silently no-ops on the active tab instead of throwing — callers must check the return value to give the user real feedback. Bulk pin/mute decide once for the whole selection (undo only if *every* selected tab already has the state, else apply to all) rather than toggling each tab independently, which would be ambiguous for mixed selections.
- `windows.js` — `computeMergePlan` is a pure function (window/tab list in, moves out) covered directly by unit tests; `mergeAllWindowsInto`/`moveTabToWindow`/`moveTabsToNewWindow` are the thin async wrappers that execute it via `chrome.tabs.move`/`chrome.windows.create`.
- `sessions.js` — save/list/delete/restore named tab snapshots in `chrome.storage.local` (key `tabManagerLiteSessions`), plus `exportSessionsJson`/`parseImportedSessions`/`importSessions` for the Options page's backup feature (imports regenerate ids and merge in front of existing sessions rather than overwriting).
- `contextMenu.js` — "abrir em aba própria" (finds an already-open `popup.html` tab and focuses it instead of duplicating) and "abrir popup" for the extension icon's right-click menu (`background.js`'s `setupContextMenus`).
- `prefs.js` — pure/thin-wrapper logic for Options-page settings: `shouldMoveToNewWindow`/`countTabsExcluding`/`applyTabLimit` (tab-limit-per-window), `computeBadgeText`, `clampPopupSize`, `incognitoSettingsUrl`.
- `state.js` — in-memory UI state (query, sort, view, duplicate mode, selection) plus every persisted pref (key `tabManagerLitePrefs`: sort, duplicate mode, view mode, theme, tab limit, window titles, badge, open-in-own-tab, popup size, compact, animations, sessions-enabled, show-action-buttons). Also `idsInRange` (shift+right-click range select) and `decideEnterAction` (Enter key: focus the one selected tab, or move multiple selected tabs to a new window).
- `render.js` — pure string-building DOM rendering (`render`, `renderSessionsView`, `renderFooter`). Takes tabs/sessions/state in, writes `innerHTML` out; holds no state itself.

**Why the split matters for testing:** every module under `src/` except `render.js` is designed to run under plain Node with `chrome.*` replaced by the mock in `src/test-helpers/chromeMock.js` — no browser or DOM needed. `render.js`, `popup.js`, `options.js`, and `background.js` are the DOM/orchestration layer and are *not* unit tested (would require adding a DOM dependency like jsdom, which conflicts with the no-build-step decision); they're validated manually in the browser. See `docs/testing/*.tdd.md` (one per feature phase) for the RED/GREEN history of the test suite.

**Event delegation pattern in `popup.js`:** all list interactions (row click to focus, checkbox, pin/mute/discard/close buttons, session restore/delete) go through a single `click` listener on `#list` that dispatches on `.closest()` class matches — there's no per-row listener attaching. When adding a new row-level action, add a new branch there and a matching class/data attribute in `render.js`'s row HTML. Right-click (select/range-select) and middle-click (close) are separate `contextmenu`/`auxclick`/`mousedown` listeners on the same `#list`, following the same delegation approach.

## Known gotchas

- **Never cache prefs across events in `background.js`.** A module-level `let prefs = ...` populated by an un-awaited async load bit us twice: MV3 service workers are killed after ~30s idle and restart on the next event, so whichever event wakes the worker back up can run before the async `chrome.storage.local.get` resolves, silently acting on stale defaults. `applyTabLimit`'s caller now does `await loadPrefs(createState())` fresh on every `tabs.onCreated`, not once at startup. If you add a new background listener that reads a setting, load it fresh inside that listener — don't add another shared cache.
- `.duplicate-mode-bar`/`#sessionBar`/`#settingsBar` visibility is toggled via the `hidden` attribute in JS, not a CSS class — if you add `display` to a rule matching those elements, add a `[hidden] { display: none }` override too, or the attribute gets silently overridden (this exact bug happened once; see git history). The bulk pin/mute/discard/close buttons used to live in their own hideable bar like this but were later merged into the always-visible footer row (disabled instead of hidden when nothing is selected) — don't reintroduce a separate hidden bar for them.
- Middle-click to close a tab needs `preventDefault()` on `mousedown` (button 1), not just in the `auxclick` handler — Chrome starts native autoscroll on mousedown, before auxclick ever fires, so preventing it there is too late.
- The `close-duplicate-tabs` keyboard shortcut (`Ctrl+Shift+D`) collides with Chrome/Brave's built-in "bookmark all tabs" shortcut. This is a known, intentionally unfixed limitation — don't "fix" it by silently changing the suggested key without checking with the user first.
- `chrome.tabs.discard()` cannot discard the currently active tab — this is real browser behavior, not a bug to route around silently; the UI already reflects it (disabled button + tooltip).
- Popup width/height (`--popup-width`/`--popup-height` CSS vars, from Options) only apply to the actual small popup — `html.is-tab` (the "open in own tab" mode) intentionally overrides them to use the full page instead.
- When packaging a release zip for the Chrome Web Store, exclude `icons/V1/` and `icons/img/` (old/source art, not referenced by `manifest.json`), `docs/`, `package.json`, `src/*.test.js`, and `src/test-helpers/` — none of it is used at runtime. See README's "Publicação" section for the full list.
