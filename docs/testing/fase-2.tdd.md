# TDD Evidence Report — Fase 2

**Source plan**: `.claude` inline plan approved in-session (no `*.plan.md` file was generated; journeys derived from the Fase 2 roadmap in `README.md`, which came from the original `/ecc:plan` output).

## User Journeys

1. Como usuário, quero salvar todas as abas de uma janela como uma "sessão" nomeada, para reabri-las depois de fechar a janela.
2. Como usuário, quero restaurar uma sessão salva, para recuperar exatamente as URLs que estavam abertas.
3. Como usuário, quero fixar/silenciar uma aba direto da lista, sem precisar clicar com o botão direito na aba do navegador.
4. Como usuário, quero suspender (descarregar) uma aba para liberar memória sem perder a posição dela na lista.
5. Como usuário, quero mesclar todas as janelas abertas em uma só, para não perder abas espalhadas.
6. Como usuário, quero um atalho de teclado que feche automaticamente as duplicatas de URL idêntica, mantendo a mais recente, sem precisar abrir o popup.

## Task Report

| Journey | Validation command | Result |
|---|---|---|
| 1–2 (sessões) | `node --test` → `src/sessions.test.js` | RED then GREEN, see below |
| 3 (pin/mute) | `node --test` → `src/actions.test.js` | RED then GREEN |
| 4 (suspender) | `node --test` → `src/actions.test.js` (`discardTab`) | RED then GREEN |
| 5 (mesclar janelas) | `node --test` → `src/windows.test.js` | RED then GREEN |
| 6 (atalho de duplicatas) | `node --test` → `src/duplicates.test.js` (`computeAutoCloseIds`) | RED then GREEN |

### RED (checkpoint commit `8533c21`)

```
node --test
...
✖ src\actions.test.js       (togglePinned/toggleMuted/discardTab not exported)
✖ src\duplicates.test.js    (computeAutoCloseIds not exported)
✖ src\sessions.test.js      (Cannot find module 'sessions.js')
✖ src\windows.test.js       (Cannot find module 'windows.js')
✖ src\tabs.test.js > normalizes muted state (actual: undefined, expected: true)
ℹ tests 7, pass 2, fail 5
```

### GREEN (checkpoint commit `4df5995`)

```
node --test
...
ℹ tests 24
ℹ suites 16
ℹ pass 24
ℹ fail 0
```

### Refactor

No refactor was needed after GREEN — the minimal implementations (`sessions.js`, `windows.js`, and the small additions to `actions.js`/`duplicates.js`/`tabs.js`) stayed small and free of duplication, so no separate refactor commit was created.

## Test Specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | `createSession` builds a deterministic `{id,name,createdAt,tabs}` record from open tabs | `src/sessions.test.js` | unit | PASS |
| 2 | A blank session name falls back to "Sessão sem nome" | `src/sessions.test.js` | unit | PASS |
| 3 | `saveSession`/`listSessions` round-trip through `chrome.storage.local`, newest first | `src/sessions.test.js` | integration (mocked chrome) | PASS |
| 4 | `deleteSession` removes only the matching session | `src/sessions.test.js` | integration | PASS |
| 5 | `restoreSession` opens a new window with the session's tab URLs, and does nothing for an empty session | `src/sessions.test.js` | integration | PASS |
| 6 | `togglePinned`/`toggleMuted` flip the right `chrome.tabs.update` flag | `src/actions.test.js` | integration | PASS |
| 7 | `discardTab` calls `chrome.tabs.discard` with the tab id | `src/actions.test.js` | integration | PASS |
| 8 | `closeTabs`/`closeOthers` (Fase 1 regression) still behave correctly | `src/actions.test.js` | integration | PASS |
| 9 | `computeMergePlan` moves only non-target-window tabs, leaves the target's own tabs alone | `src/windows.test.js` | unit | PASS |
| 10 | `mergeAllWindowsInto` issues one `chrome.tabs.move` per tab outside the target window | `src/windows.test.js` | integration | PASS |
| 11 | `moveTabToWindow` moves a single tab with the right `windowId` | `src/windows.test.js` | integration | PASS |
| 12 | `idsToCloseKeepingOne` keeps the highest-id (most recent) tab in a duplicate group | `src/duplicates.test.js` | unit | PASS |
| 13 | `computeAutoCloseIds` collects close-ids across every exact-URL duplicate group | `src/duplicates.test.js` | unit | PASS |
| 14 | `groupBySite`/`groupByExactUrl` (Fase 1 regression) still group correctly | `src/duplicates.test.js` | unit | PASS |
| 15 | `getAllTabs` normalizes `mutedInfo.muted` into `tab.muted` | `src/tabs.test.js` | integration | PASS |
| 16 | `getAllTabs`/`groupByWindow` sorting and grouping (Fase 1 regression) | `src/tabs.test.js` | unit | PASS |

## Coverage and Known Gaps

```
node --test --experimental-test-coverage
all files: 94.70% lines | 82.80% branch | 77.05% funcs
  actions.js:    89.29% lines (uncovered: focusTab, 4-6)
  duplicates.js: 86.36% lines (uncovered: getHostname's catch branch, empty-key guard)
  sessions.js:   100% lines
  tabs.js:       100% lines
  windows.js:    100% lines
```

- `funcs %` (77.05%) is pulled down mainly by `src/test-helpers/chromeMock.js` (a test double, not production code) exercising only the mock methods each test actually needs.
- `actions.js:focusTab` isn't unit tested (thin `chrome.windows.update`/`chrome.tabs.update` wrapper, validated manually).
- **`render.js`, `popup.js`, and `background.js` have no automated coverage.** They're the DOM/orchestration layer — testing them would require adding a DOM dependency (e.g. jsdom), which conflicts with the project's explicit "extensão leve, sem build" decision from the Fase 1 plan. This mirrors the Fase 1 approach: these layers are validated manually by loading the unpacked extension in `chrome://extensions`, per `README.md`.

## Merge Evidence

Checkpoint commits are kept as-is (not squashed):
- `8533c21` — RED: Fase 2 tests added, failing for the intended reasons.
- `4df5995` — GREEN: minimal implementation, all 24 tests passing.
- (this report + UI wiring) — feat commit finishing the popup/background integration, no logic changes to the tested modules.

## Bug Fix: "Suspender" (discard) reported as doing nothing

**Root cause**: `chrome.tabs.discard()` silently refuses to discard the *active* tab (returns the tab unchanged instead of throwing), and the popup UI had zero visual indication of a discarded tab — so even a successful discard on a background tab looked like nothing happened.

- RED commit `9d44bd3`: updated `chromeMock.js` to model the active-tab refusal; added failing tests asserting `discardTab()` returns `true`/`false`, and that `getAllTabs()` normalizes `tab.discarded`.

  ```
  node --test
  ✖ src\actions.test.js > reports failure when the tab cannot be discarded (actual: undefined, expected: false)
  ✖ src\tabs.test.js > normalizes discarded state (actual: undefined, expected: true)
  ```

- GREEN commit `a816f2d`: `discardTab()` now returns whether `chrome.tabs.discard` actually set `discarded: true`; `tabs.js` normalizes `discarded`.

  ```
  node --test
  ℹ tests 26, pass 26, fail 0
  ```

- Follow-up UI commit (untested DOM layer, same gap documented above): discard button is now `disabled` with an explanatory tooltip when the tab is active or already discarded, rows show a "suspensa" badge and dim, and the popup shows a transient status message ("Aba suspensa." / "Não foi possível suspender...") so the result is always visible.

**Known limitation kept as-is per user decision**: the `Ctrl+Shift+D` shortcut collides with Brave/Chrome's native "bookmark all tabs" binding. The user asked to leave it unchanged for now rather than rebind it.
