# TDD Evidence Report — Bulk actions bar for multi-selection

**Source**: conversational request (screenshot annotated with the desired location, below the existing selection footer).

## User Journey

Como usuário, ao selecionar uma ou mais abas, quero ver os botões de fixar/silenciar/suspender/fechar aparecerem logo abaixo do resumo de seleção, para aplicar a ação em todas as abas selecionadas de uma vez, sem repetir uma por uma.

## Task Report

| Task | Validation command | Result |
|---|---|---|
| `bulkPin`/`bulkMute`/`bulkDiscard` in `actions.js` | `node --test` → `src/actions.test.js` | RED then GREEN |

### RED (checkpoint commit `4d559e6`)

```
node --test
SyntaxError: './actions.js' does not provide an export named 'bulkDiscard'
ℹ tests 61, pass 60, fail 1
```

### GREEN (checkpoint commit `e3d3122`)

```
node --test
ℹ tests 72, pass 72, fail 0
```

## Test Specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | `bulkPin` pins every tab when at least one isn't pinned yet | `src/actions.test.js` | integration | PASS |
| 2 | `bulkPin` unpins every tab when all are already pinned | `src/actions.test.js` | integration | PASS |
| 3 | `bulkMute` mutes/unmutes every tab with the same majority rule | `src/actions.test.js` | integration | PASS |
| 4 | `bulkDiscard` attempts every given id and returns how many actually succeeded | `src/actions.test.js` | integration | PASS |

## Design note: majority rule instead of per-tab toggle

Pinning/muting a mixed selection (some already pinned, some not) can't be a per-tab toggle without producing an inconsistent result the user didn't ask for. `bulkPin`/`bulkMute` instead decide once for the whole selection: if every selected tab already has the state, undo it for all; otherwise apply it to all. This mirrors how most multi-select UIs (e.g. checkbox tri-state) handle mixed states.

## Coverage

```
node --test --experimental-test-coverage
all files: 97.47% lines | 89.44% branch | 84.38% funcs
```

## Known Gap

`popup.html`/`popup.css`/`popup.js` wiring (the bulk-actions bar itself, its visibility toggle, and the click handlers) has no automated coverage — same documented DOM/orchestration gap as every previous phase (see `CLAUDE.md`). Validated manually: select 2+ tabs, confirm the bar appears below the footer and each button acts on the whole selection.

## Merge Evidence

- `4d559e6` — RED: bulk-action tests added, failing for the intended reason.
- `e3d3122` — GREEN: `bulkPin`/`bulkMute`/`bulkDiscard` implemented, 72/72 tests passing.
- `77049ab` — UI wiring: bulk-actions bar in the popup (untested DOM layer, same documented gap).
