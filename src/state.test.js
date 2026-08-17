import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import { createState, loadPrefs, savePrefs, idsInRange, decideEnterAction } from "./state.js";

describe("createState", () => {
  test("defaults include list view and dark theme", () => {
    const state = createState();
    assert.equal(state.viewMode, "list");
    assert.equal(state.theme, "dark");
    assert.equal(state.selected.size, 0);
  });

  test("defaults include the Fase 4 options (tab limit disabled, titles/badge on, popup mode)", () => {
    const state = createState();
    assert.equal(state.tabLimit, 0);
    assert.equal(state.windowTitles, true);
    assert.equal(state.badge, true);
    assert.equal(state.openInOwnTab, false);
  });

  test("defaults include the Fase 5 options (popup size, compact, animations, sessions, action buttons)", () => {
    const state = createState();
    assert.equal(state.popupWidth, 380);
    assert.equal(state.popupHeight, 560);
    assert.equal(state.compact, false);
    assert.equal(state.animations, true);
    assert.equal(state.sessionsEnabled, true);
    assert.equal(state.showActionButtons, true);
  });
});

describe("prefs persistence", () => {
  test("loadPrefs applies stored viewMode/theme over the defaults", async () => {
    installChromeMock();
    await chrome.storage.local.set({
      tabManagerLitePrefs: { sortBy: "title", duplicateMode: "url", viewMode: "grid", theme: "light" },
    });
    const state = await loadPrefs(createState());
    assert.equal(state.viewMode, "grid");
    assert.equal(state.theme, "light");
  });

  test("loadPrefs applies stored tabLimit/windowTitles/badge/openInOwnTab over the defaults", async () => {
    installChromeMock();
    await chrome.storage.local.set({
      tabManagerLitePrefs: { tabLimit: 15, windowTitles: false, badge: false, openInOwnTab: true },
    });
    const state = await loadPrefs(createState());
    assert.equal(state.tabLimit, 15);
    assert.equal(state.windowTitles, false);
    assert.equal(state.badge, false);
    assert.equal(state.openInOwnTab, true);
  });

  test("loadPrefs applies stored Fase 5 options over the defaults", async () => {
    installChromeMock();
    await chrome.storage.local.set({
      tabManagerLitePrefs: {
        popupWidth: 600,
        popupHeight: 500,
        compact: true,
        animations: false,
        sessionsEnabled: false,
        showActionButtons: false,
      },
    });
    const state = await loadPrefs(createState());
    assert.equal(state.popupWidth, 600);
    assert.equal(state.popupHeight, 500);
    assert.equal(state.compact, true);
    assert.equal(state.animations, false);
    assert.equal(state.sessionsEnabled, false);
    assert.equal(state.showActionButtons, false);
  });

  test("savePrefs persists viewMode and theme alongside the existing prefs", async () => {
    installChromeMock();
    const state = createState();
    state.viewMode = "grid";
    state.theme = "light";
    await savePrefs(state);
    const stored = await chrome.storage.local.get("tabManagerLitePrefs");
    assert.deepEqual(stored.tabManagerLitePrefs, {
      sortBy: "opened",
      duplicateMode: "site",
      viewMode: "grid",
      theme: "light",
      tabLimit: 0,
      windowTitles: true,
      badge: true,
      openInOwnTab: false,
      popupWidth: 380,
      popupHeight: 560,
      compact: false,
      animations: true,
      sessionsEnabled: true,
      showActionButtons: true,
    });
  });
});

describe("decideEnterAction", () => {
  test("does nothing when no tab is selected", () => {
    assert.deepEqual(decideEnterAction(new Set()), { type: "none" });
  });

  test("focuses the single selected tab", () => {
    assert.deepEqual(decideEnterAction(new Set([42])), { type: "focus", id: 42 });
  });

  test("moves every selected tab to a new window when more than one is selected", () => {
    const action = decideEnterAction(new Set([3, 1, 2]));
    assert.equal(action.type, "moveToNewWindow");
    assert.deepEqual([...action.ids].sort(), [1, 2, 3]);
  });
});

describe("idsInRange", () => {
  test("returns the ids between two ids inclusive, in list order", () => {
    const ordered = [1, 2, 3, 4, 5];
    assert.deepEqual(idsInRange(ordered, 2, 4), [2, 3, 4]);
  });

  test("works when the range is given in reverse order", () => {
    const ordered = [1, 2, 3, 4, 5];
    assert.deepEqual(idsInRange(ordered, 4, 2), [2, 3, 4]);
  });

  test("falls back to just the target id when there is no previous selection", () => {
    assert.deepEqual(idsInRange([1, 2, 3], null, 2), [2]);
  });
});
