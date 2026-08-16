# TDD Evidence Report — Fase 4

**Source**: inline plan approved in-session (`/ecc:plan`), scoped from `stefanXO/Tab-Manager-Plus`'s `TabOptions.tsx` (analyzed in Fase 3) with several sections deliberately dropped (popup width/height, compact mode/animations, minimize inactive windows, action-buttons toggle) — see the plan for the full comparison table and rationale.

## User Journeys

1. Como usuário, quero limitar quantas abas cabem numa janela; ao exceder, novas abas devem abrir numa janela nova automaticamente.
2. Como usuário, quero desligar o contador de abas no ícone da extensão, se eu não quiser vê-lo.
3. Como usuário, quero desligar os títulos de janela na lista de abas.
4. Como usuário, quero que o ícone da extensão abra direto numa aba própria (em vez do popup pequeno), se eu configurar isso.
5. Como usuário, quero exportar minhas sessões salvas para um arquivo, e importar de volta depois (ou em outro perfil), sem perder as sessões que já tenho.

## Task Report

| Journey | Validation command | Result |
|---|---|---|
| 1 (limite de abas) | `node --test` → `src/prefs.test.js` | RED then GREEN |
| 2 (badge) | `node --test` → `src/prefs.test.js` | RED then GREEN |
| 1–4 (prefs persistidas) | `node --test` → `src/state.test.js` | RED then GREEN |
| 5 (backup de sessões) | `node --test` → `src/sessions.test.js` | RED then GREEN |

### RED (checkpoint commit `16c8473`)

```
node --test
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'prefs.js'
SyntaxError: './sessions.js' does not provide an export named 'exportSessionsJson'
✖ state.test.js > loadPrefs applies stored tabLimit/... (undefined !== 15)
✖ state.test.js > savePrefs persists viewMode and theme alongside... (missing tabLimit/windowTitles/badge/openInOwnTab)
ℹ tests 35, pass 30, fail 5
```

### GREEN (checkpoint commit `5db1a88`)

```
node --test
ℹ tests 50, pass 50, fail 0
```

### Refactor

No separate refactor commit — `prefs.js` stayed to two small pure functions, and the `state.js`/`sessions.js` additions followed the existing shape (default → load → save; pure-parse → thin-storage-wrapper) without needing cleanup.

## Test Specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | `shouldMoveToNewWindow` never triggers when the limit is `0` (disabled) | `src/prefs.test.js` | unit | PASS |
| 2 | `shouldMoveToNewWindow` triggers once the window already has `>= limit` tabs | `src/prefs.test.js` | unit | PASS |
| 3 | `computeBadgeText` returns the count as a string, or `""` when the badge is disabled | `src/prefs.test.js` | unit | PASS |
| 4 | `createState` defaults `tabLimit:0, windowTitles:true, badge:true, openInOwnTab:false` | `src/state.test.js` | unit | PASS |
| 5 | `loadPrefs` applies stored `tabLimit`/`windowTitles`/`badge`/`openInOwnTab` over the defaults | `src/state.test.js` | integration | PASS |
| 6 | `savePrefs` persists all four new fields alongside the existing ones | `src/state.test.js` | integration | PASS |
| 7 | `exportSessionsJson` round-trips sessions through `JSON.stringify`/`parse` | `src/sessions.test.js` | unit | PASS |
| 8 | `parseImportedSessions` keeps only session-shaped entries and regenerates their id | `src/sessions.test.js` | unit | PASS |
| 9 | `parseImportedSessions` returns `[]` for malformed JSON or a non-array payload | `src/sessions.test.js` | unit | PASS |
| 10 | `importSessions` merges valid imports in front of existing sessions | `src/sessions.test.js` | integration | PASS |
| 11 | `importSessions` leaves storage untouched when nothing valid is imported | `src/sessions.test.js` | integration | PASS |

## Coverage and Known Gaps

```
node --test --experimental-test-coverage
all files: 96.83% lines | 86.90% branch | 81.93% funcs
  prefs.js:    100%
  sessions.js: 100% lines
  state.js:    100% lines
```

Same documented gap as Fases 2–3: `options.html`/`options.js`, `render.js`, `popup.js`, and `background.js`'s tab-limit/badge/popup-toggle wiring have no automated coverage — DOM/orchestration layer, validated manually per the no-build-step/no-jsdom decision in `CLAUDE.md`.

## Manual Verification Checklist (browser)

- [ ] `chrome://extensions` → Detalhes → "Opções da extensão" abre `options.html` como aba.
- [ ] Definir "Limitar abas por janela" = 2, abrir uma 3ª aba numa janela com 2 → a nova aba vai para uma janela nova.
- [ ] Desligar "Mostrar contador de abas" → badge do ícone some; religar → volta a mostrar a contagem.
- [ ] Desligar "Mostrar títulos de janela" → cabeçalhos "Janela N" somem da lista no popup.
- [ ] Ligar "Abrir em aba própria por padrão" → clicar no ícone abre `popup.html` como aba (não o popup pequeno); desligar reverte.
- [ ] Exportar sessões → baixa um `.json`; importar esse mesmo arquivo → sessões aparecem duplicadas com ids novos, sem perder as existentes.
- [ ] Botão "Mais opções…" no popup abre a página de Opções.

## Bug Fix: tab limit triggered one tab late (off-by-one)

**Reported**: with the limit set to 156, the move only happened when opening the 158th tab, not the 157th.

**Root cause**: `background.js` computed `countBeforeThisTab` as `windowTabs.length - 1`, assuming `chrome.tabs.query` always already includes the just-created tab at the moment `tabs.onCreated` fires. When Chrome runs the query before the new tab is attached to the window's tab list, that subtraction removes a tab that was never counted in the first place, undercounting by one and delaying the move by one extra tab.

- RED commit `0147987`: added `countTabsExcluding(windowTabs, excludeTabId)` tests — filtering by id instead of assuming presence, covering both cases (tab present in the query result, and not).
- GREEN commit `79f1d73`: implemented `countTabsExcluding` in `prefs.js`.
- Follow-up commit: `background.js`'s `tabs.onCreated` handler now calls `countTabsExcluding(windowTabs, tab.id)` instead of `windowTabs.length - 1`.

```
node --test
ℹ tests 52, pass 52, fail 0
```

**This did not fix the reported symptom** — the user retested and still saw the move happen at the 158th tab, not the 157th, with no change in behavior. That ruled out the counting formula (which was mathematically equivalent before and after in the common case) and pointed at something else entirely.

### Follow-up: the real root cause was an MV3 service-worker cold-start race

`background.js` cached prefs in a module-level `let prefs = createState()`, refreshed asynchronously by `refreshPrefs()` (`chrome.storage.local.get` under the hood) and never awaited at top level. MV3 service workers are killed after ~30s idle and restarted on the next event. Whichever tab-creation event wakes the worker back up can run its listener **before** that async `refreshPrefs()` load resolves — so that one tab sees `prefs.tabLimit` still at its default (`0`, disabled) and skips the check entirely. Only the *next* tab creation, by which point prefs has loaded, correctly sees `tabLimit: 156` — a consistent one-tab-late symptom that exactly matches what was reported, and explains why the earlier counting fix had zero observable effect (it fixed a real but not-yet-manifesting edge case, not this one).

**Fix**: the `tabs.onCreated` handler now calls `await loadPrefs(createState())` itself for every single tab creation, instead of trusting the module-level cache, so the tab-limit decision is never stale regardless of service-worker wake timing. The top-level `refreshPrefs()` call is also now `await`ed (top-level await, valid in this ES module) to shrink the staleness window for the badge/popup-mode behaviors too.

This fix lives entirely in `background.js` (the untested orchestration layer — see the documented gap above); the underlying pieces it composes (`loadPrefs`, `countTabsExcluding`, `shouldMoveToNewWindow`) are already covered by the existing unit tests. Verified with `node --test` (52/52 still passing) plus manual retest in the browser.

## Merge Evidence

Checkpoint commits kept as-is (not squashed):
- `16c8473` — RED: Fase 4 tests added, failing for the intended reasons.
- `5db1a88` — GREEN: minimal implementation, 50/50 tests passing.
- `b5a92b7` — Options page + UI wiring (untested DOM/orchestration layer, same documented gap).
