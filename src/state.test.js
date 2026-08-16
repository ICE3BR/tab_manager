import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import { createState, loadPrefs, savePrefs, idsInRange } from "./state.js";

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
    });
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
