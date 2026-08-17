import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import { computeMergePlan, mergeAllWindowsInto, moveTabToWindow, moveTabsToNewWindow } from "./windows.js";

describe("computeMergePlan", () => {
  test("moves tabs from other windows into the target, leaves target's own tabs untouched", () => {
    const windowsWithTabs = [
      { id: 1, tabs: [{ id: 10 }, { id: 11 }] },
      { id: 2, tabs: [{ id: 20 }] },
    ];
    const plan = computeMergePlan(windowsWithTabs, 1);
    assert.deepEqual(plan.moves, [{ tabId: 20, targetWindowId: 1 }]);
    assert.deepEqual(plan.windowsToClose, [2]);
  });

  test("returns no moves when there is only one window", () => {
    const plan = computeMergePlan([{ id: 1, tabs: [{ id: 10 }] }], 1);
    assert.deepEqual(plan.moves, []);
    assert.deepEqual(plan.windowsToClose, []);
  });
});

describe("mergeAllWindowsInto", () => {
  test("calls chrome.tabs.move for every tab outside the target window", async () => {
    const { calls } = installChromeMock();
    const allTabs = [
      { id: 10, windowId: 1 },
      { id: 20, windowId: 2 },
      { id: 21, windowId: 2 },
    ];
    await mergeAllWindowsInto(1, allTabs);
    assert.deepEqual(
      calls.tabsMove.map((c) => ({ tabId: c.tabId, windowId: c.moveProps.windowId })),
      [
        { tabId: 20, windowId: 1 },
        { tabId: 21, windowId: 1 },
      ]
    );
  });
});

describe("moveTabToWindow", () => {
  test("moves a single tab to the given window", async () => {
    const { calls } = installChromeMock();
    await moveTabToWindow(42, 7);
    assert.deepEqual(calls.tabsMove, [{ tabId: 42, moveProps: { windowId: 7, index: -1 } }]);
  });
});

describe("moveTabsToNewWindow", () => {
  test("creates a new window from the first tab, then moves the rest into it", async () => {
    const { calls } = installChromeMock();
    await moveTabsToNewWindow([1, 2, 3]);
    assert.deepEqual(calls.windowsCreate, [{ tabId: 1 }]);
    assert.deepEqual(
      calls.tabsMove.map((c) => ({ tabId: c.tabId, windowId: c.moveProps.windowId })),
      [
        { tabId: 2, windowId: 9999 },
        { tabId: 3, windowId: 9999 },
      ]
    );
  });

  test("does nothing for an empty list", async () => {
    const { calls } = installChromeMock();
    await moveTabsToNewWindow([]);
    assert.equal(calls.windowsCreate.length, 0);
  });
});
