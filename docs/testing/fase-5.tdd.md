# TDD Evidence Report — Fase 5

**Source**: inline plan approved in-session (`/ecc:plan`), based on a fresh set of `stefanXO/Tab-Manager-Plus` options-page screenshots the user supplied, cross-checked against what Fase 4 had already implemented/deliberately skipped. "Minimize inactive windows" was again deliberately excluded per user decision (needs the optional `system.display` permission, low value).

## User Journeys

1. Como usuário, quero ajustar a largura/altura do popup (até 800×600), preservando a opção de abrir em aba própria pra telas maiores.
2. Como usuário, quero alternar modo escuro, modo compacto e animações direto na página de Opções.
3. Como usuário, quero desabilitar a aba "Sessões" inteira se eu não usar essa funcionalidade.
4. Como usuário, quero esconder os botões de ação (fixar/silenciar/suspender/fechar) das linhas se eu preferir uma lista mais limpa.
5. Como usuário, quero um atalho pra liberar a extensão no modo anônimo do navegador.
6. Como usuário, quero fechar uma aba com o clique do meio, e usar Enter pra focar a aba selecionada (ou mover várias abas selecionadas pra uma janela nova).

## Task Report

| Journey | Validation command | Result |
|---|---|---|
| 1 (tamanho do popup) | `node --test` → `src/prefs.test.js` (`clampPopupSize`) | RED then GREEN |
| 2–4 (novas prefs) | `node --test` → `src/state.test.js` | RED then GREEN |
| 5 (link incógnito) | `node --test` → `src/prefs.test.js` (`incognitoSettingsUrl`) | RED then GREEN |
| 6 (Enter / mover pra nova janela) | `node --test` → `src/state.test.js` (`decideEnterAction`) + `src/windows.test.js` (`moveTabsToNewWindow`) | RED then GREEN |

### RED (checkpoint commit `8ddd938`)

```
node --test
SyntaxError: './prefs.js' does not provide an export named 'clampPopupSize'
SyntaxError: './state.js' does not provide an export named 'decideEnterAction'
SyntaxError: './windows.js' does not provide an export named 'moveTabsToNewWindow'
ℹ tests 36, pass 33, fail 3
```

### GREEN (checkpoint commit `dac694d`)

```
node --test
ℹ tests 67, pass 67, fail 0
```

### Refactor

No separate refactor commit — each addition (`clampPopupSize`, `incognitoSettingsUrl`, `decideEnterAction`, `moveTabsToNewWindow`) stayed a small, single-purpose function matching the established shape (pure decision function, or a thin async wrapper over `chrome.*`), so nothing needed cleanup after GREEN.

## Test Specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | `clampPopupSize` clamps width to [300,800] and height to [400,600] | `src/prefs.test.js` | unit | PASS |
| 2 | `clampPopupSize` passes valid values through unchanged | `src/prefs.test.js` | unit | PASS |
| 3 | `clampPopupSize` falls back to the default size for non-numeric input | `src/prefs.test.js` | unit | PASS |
| 4 | `incognitoSettingsUrl` builds the correct `chrome://extensions/?id=` URL | `src/prefs.test.js` | unit | PASS |
| 5 | `createState` defaults popupWidth/popupHeight/compact/animations/sessionsEnabled/showActionButtons | `src/state.test.js` | unit | PASS |
| 6 | `loadPrefs` applies all six stored Fase 5 options over the defaults | `src/state.test.js` | integration | PASS |
| 7 | `savePrefs` persists all six new fields alongside the existing ones | `src/state.test.js` | integration | PASS |
| 8 | `decideEnterAction` returns `none`/`focus`/`moveToNewWindow` based on selection size | `src/state.test.js` | unit | PASS |
| 9 | `moveTabsToNewWindow` creates a window from the first tab, moves the rest into it | `src/windows.test.js` | integration | PASS |
| 10 | `moveTabsToNewWindow` does nothing for an empty list | `src/windows.test.js` | integration | PASS |

## Coverage and Known Gaps

```
node --test --experimental-test-coverage
all files: 97.34% lines | 88.82% branch | 83.52% funcs
  prefs.js: 100%
  state.js: 100% lines
  windows.js: 100%
```

Same documented gap as Fases 2–4: `options.html`/`options.js`, `render.js`, `popup.js` (including the new middle-click/Enter-key wiring and appearance-pref application) have no automated coverage — DOM/orchestration layer, validated manually per the no-build-step/no-jsdom decision in `CLAUDE.md`.

## Manual Verification Checklist (browser)

- [ ] Ajustar largura/altura do popup em Opções → o popup normal reflete o novo tamanho; o modo "aba própria" continua livre (ignora esses valores).
- [ ] Alternar Escuro/Compacto/Animações em Opções → reflete no popup imediatamente na próxima abertura.
- [ ] Desabilitar "Habilitar sessões" → a aba "Sessões" some do popup.
- [ ] Desabilitar "Mostrar botões de ação" → pin/mute/suspender/fechar somem das linhas.
- [ ] "Permitir em modo anônimo" abre `chrome://extensions/?id=<id>` com a extensão certa focada.
- [ ] Clique do meio numa aba fecha ela.
- [ ] Selecionar 1 aba + Enter → foca ela. Selecionar 2+ abas + Enter → todas vão para uma janela nova.
- [ ] Enter dentro do campo de busca ou do nome da sessão **não** deve disparar a ação (deve digitar normalmente).

## Merge Evidence

Checkpoint commits kept as-is (not squashed):
- `8ddd938` — RED: Fase 5 tests added, failing for the intended reasons.
- `dac694d` — GREEN: minimal implementation, 67/67 tests passing.
- `989c948` — Options page + popup UI wiring (untested DOM/orchestration layer, same documented gap).
