# TDD Evidence Report — Fase 3

**Source**: inline plan approved in-session (`/ecc:plan`), based on an analysis of `stefanXO/Tab-Manager-Plus` (see plan for the feature-comparison table).

## User Journeys

1. Como usuário, quero clicar com o botão direito numa aba do popup para selecioná-la rapidamente, sem abrir o menu nativo do navegador.
2. Como usuário, quero segurar Shift e clicar com o botão direito para selecionar um intervalo de abas de uma vez.
3. Como usuário, quero clicar com o botão direito no ícone da extensão e ver um menu com "Abrir em aba própria" e "Abrir popup".
4. Como usuário, ao escolher "Abrir em aba própria", quero que reabra a mesma aba se ela já estiver aberta, em vez de duplicar.
5. Como usuário, quero alternar entre visualização em Lista e em Grade, e entre tema Escuro e Claro, com a escolha persistida.

## Task Report

| Journey | Validation command | Result |
|---|---|---|
| 1–2 (seleção) | `node --test` → `src/state.test.js` (`idsInRange`) | RED then GREEN |
| 3–4 (menu de contexto) | `node --test` → `src/contextMenu.test.js` | RED then GREEN |
| 5 (visualização/tema) | `node --test` → `src/state.test.js` (prefs) | RED then GREEN |

### RED (checkpoint commit `321abe9`)

```
node --test
✖ src\contextMenu.test.js  (Cannot find module 'contextMenu.js')
✖ src\state.test.js        (does not provide an export named 'idsInRange')
ℹ tests 28, pass 26, fail 2
```

### GREEN (checkpoint commit `155b70d`)

```
node --test
ℹ tests 37, pass 37, fail 0
```

### Refactor

No separate refactor commit — `contextMenu.js` and the `state.js` additions stayed small and matched existing patterns (`sessions.js`/`windows.js`'s pure-function-plus-thin-wrapper shape) on the first pass.

## Test Specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | `findExistingPopupTab` finds a tab whose URL starts with the popup URL, `undefined` otherwise | `src/contextMenu.test.js` | unit | PASS |
| 2 | `openAsOwnTab` creates `popup.html?tab=true` when no instance is open | `src/contextMenu.test.js` | integration | PASS |
| 3 | `openAsOwnTab` focuses+highlights the existing tab instead of creating a duplicate | `src/contextMenu.test.js` | integration | PASS |
| 4 | `openPopupFromMenu` calls `chrome.action.openPopup` | `src/contextMenu.test.js` | integration | PASS |
| 5 | `createState` defaults to `viewMode: "list"`, `theme: "dark"` | `src/state.test.js` | unit | PASS |
| 6 | `loadPrefs` applies stored `viewMode`/`theme` over the defaults | `src/state.test.js` | integration | PASS |
| 7 | `savePrefs` persists `viewMode`/`theme` alongside `sortBy`/`duplicateMode` | `src/state.test.js` | integration | PASS |
| 8 | `idsInRange` returns the ids between two ids inclusive, in list order, both directions | `src/state.test.js` | unit | PASS |
| 9 | `idsInRange` falls back to just the target id with no previous selection | `src/state.test.js` | unit | PASS |

## Coverage and Known Gaps

```
node --test --experimental-test-coverage
all files: 96.35% lines | 84.75% branch | 81.33% funcs
  contextMenu.js: 100%
  state.js:       100% lines
```

Same documented gap as Fase 2: `render.js`, `popup.js`, and `background.js` (the DOM/orchestration layer — right-click delegation, the settings panel, `setupContextMenus`) have no automated coverage, validated manually instead, per the project's no-build-step/no-jsdom decision (see `CLAUDE.md`).

## Manual Verification Checklist (browser)

- [ ] Right-click a tab row → row gets selected (highlighted + checkbox checked), no native context menu appears.
- [ ] Shift+right-click another row → every row between the two gets selected.
- [ ] Right-click the extension icon → menu shows "Abrir em aba própria", "Abrir popup", separator, "Atalhos de teclado".
- [ ] "Abrir em aba própria" opens `popup.html` as a full tab; clicking it again focuses the same tab instead of opening a second one.
- [ ] Settings (⚙) → Grade shows a favicon grid with hover tooltips; Lista returns to the normal rows.
- [ ] Settings (⚙) → Claro switches to a light palette; reopening the popup keeps the chosen theme/view.

## Merge Evidence

Checkpoint commits kept as-is (not squashed):
- `321abe9` — RED: Fase 3 tests added, failing for the intended reasons.
- `155b70d` — GREEN: minimal implementation, 37/37 tests passing.
- `227788c` — UI wiring (untested DOM/orchestration layer, same documented gap).
