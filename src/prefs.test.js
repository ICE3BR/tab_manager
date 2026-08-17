import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import {
  shouldMoveToNewWindow,
  computeBadgeText,
  countTabsExcluding,
  applyTabLimit,
  clampPopupSize,
  incognitoSettingsUrl,
} from "./prefs.js";

describe("shouldMoveToNewWindow", () => {
  test("never moves when the limit is disabled (0)", () => {
    assert.equal(shouldMoveToNewWindow(50, 0), false);
  });

  test("moves once the window already has at least `limit` tabs", () => {
    assert.equal(shouldMoveToNewWindow(15, 15), true);
    assert.equal(shouldMoveToNewWindow(20, 15), true);
  });

  test("does not move while still under the limit", () => {
    assert.equal(shouldMoveToNewWindow(14, 15), false);
  });
});

describe("countTabsExcluding", () => {
  test("counts every tab in the window except the given tab id", () => {
    const windowTabs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    assert.equal(countTabsExcluding(windowTabs, 2), 2);
  });

  test("is robust when the excluded tab isn't in the list yet (query ran before it was added)", () => {
    const windowTabs = [{ id: 1 }, { id: 2 }];
    assert.equal(countTabsExcluding(windowTabs, 999), 2);
  });
});

describe("applyTabLimit", () => {
  test("does nothing when the limit is disabled (0), regardless of tab count", async () => {
    const { calls } = installChromeMock({
      tabs: [{ id: 1, windowId: 1 }, { id: 2, windowId: 1 }, { id: 3, windowId: 1 }],
    });
    const moved = await applyTabLimit({ id: 3, windowId: 1 }, 0);
    assert.equal(moved, false);
    assert.equal(calls.windowsCreate.length, 0);
  });

  test("moves the new tab to a new window once the window already has `limit` other tabs", async () => {
    const { calls } = installChromeMock({
      tabs: [{ id: 1, windowId: 1 }, { id: 2, windowId: 1 }, { id: 3, windowId: 1 }],
    });
    const moved = await applyTabLimit({ id: 3, windowId: 1 }, 2);
    assert.equal(moved, true);
    assert.deepEqual(calls.windowsCreate, [{ tabId: 3 }]);
  });

  test("does not move while the window is still under the limit", async () => {
    const { calls } = installChromeMock({
      tabs: [{ id: 1, windowId: 1 }, { id: 2, windowId: 1 }],
    });
    const moved = await applyTabLimit({ id: 2, windowId: 1 }, 5);
    assert.equal(moved, false);
    assert.equal(calls.windowsCreate.length, 0);
  });

  test("is robust when chrome.tabs.query hasn't attached the new tab to the window yet", async () => {
    // Simulates the race this bug was about: the query result doesn't
    // include the tab that triggered onCreated.
    const { calls } = installChromeMock({
      tabs: [{ id: 1, windowId: 1 }, { id: 2, windowId: 1 }],
    });
    const moved = await applyTabLimit({ id: 999, windowId: 1 }, 2);
    assert.equal(moved, true);
    assert.deepEqual(calls.windowsCreate, [{ tabId: 999 }]);
  });
});

describe("clampPopupSize", () => {
  test("clamps width to [300, 800] and height to [400, 600]", () => {
    assert.deepEqual(clampPopupSize({ width: 100, height: 100 }), { width: 300, height: 400 });
    assert.deepEqual(clampPopupSize({ width: 5000, height: 5000 }), { width: 800, height: 600 });
  });

  test("passes valid values through unchanged", () => {
    assert.deepEqual(clampPopupSize({ width: 500, height: 500 }), { width: 500, height: 500 });
  });

  test("falls back to the default size for non-numeric input", () => {
    assert.deepEqual(clampPopupSize({ width: NaN, height: undefined }), { width: 380, height: 560 });
  });
});

describe("incognitoSettingsUrl", () => {
  test("builds the chrome://extensions details URL for the given extension id", () => {
    assert.equal(incognitoSettingsUrl("abc123"), "chrome://extensions/?id=abc123");
  });
});

describe("computeBadgeText", () => {
  test("returns the tab count as a string when the badge is enabled", () => {
    assert.equal(computeBadgeText(42, true), "42");
  });

  test("returns an empty string when the badge is disabled", () => {
    assert.equal(computeBadgeText(42, false), "");
  });
});
