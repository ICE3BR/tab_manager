import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import { closeTabs, closeOthers, togglePinned, toggleMuted, discardTab, bulkPin, bulkMute, bulkDiscard } from "./actions.js";

describe("closeTabs", () => {
  test("does nothing for an empty id list", async () => {
    const { calls } = installChromeMock();
    await closeTabs([]);
    assert.equal(calls.tabsRemove.length, 0);
  });

  test("removes the given tab ids", async () => {
    const { calls } = installChromeMock();
    await closeTabs([1, 2]);
    assert.deepEqual(calls.tabsRemove, [[1, 2]]);
  });
});

describe("closeOthers", () => {
  test("closes every unpinned tab except the one being kept", async () => {
    const tabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: false },
      { id: 3, pinned: true },
    ];
    const { calls } = installChromeMock();
    await closeOthers(1, tabs);
    assert.deepEqual(calls.tabsRemove, [[2]]);
  });
});

describe("togglePinned", () => {
  test("flips the pinned state via chrome.tabs.update", async () => {
    const { calls } = installChromeMock();
    await togglePinned({ id: 5, pinned: false });
    assert.deepEqual(calls.tabsUpdate, [{ tabId: 5, changes: { pinned: true } }]);
  });
});

describe("toggleMuted", () => {
  test("flips the muted state via chrome.tabs.update", async () => {
    const { calls } = installChromeMock();
    await toggleMuted({ id: 5, muted: true });
    assert.deepEqual(calls.tabsUpdate, [{ tabId: 5, changes: { muted: false } }]);
  });
});

describe("bulkPin", () => {
  test("pins every tab when at least one of them isn't pinned yet", async () => {
    const { calls } = installChromeMock();
    const tabs = [{ id: 1, pinned: true }, { id: 2, pinned: false }];
    const pinned = await bulkPin(tabs);
    assert.equal(pinned, true);
    assert.deepEqual(calls.tabsUpdate, [
      { tabId: 1, changes: { pinned: true } },
      { tabId: 2, changes: { pinned: true } },
    ]);
  });

  test("unpins every tab when all of them are already pinned", async () => {
    const { calls } = installChromeMock();
    const tabs = [{ id: 1, pinned: true }, { id: 2, pinned: true }];
    const pinned = await bulkPin(tabs);
    assert.equal(pinned, false);
    assert.deepEqual(calls.tabsUpdate, [
      { tabId: 1, changes: { pinned: false } },
      { tabId: 2, changes: { pinned: false } },
    ]);
  });
});

describe("bulkMute", () => {
  test("mutes every tab when at least one of them isn't muted yet", async () => {
    const { calls } = installChromeMock();
    const tabs = [{ id: 1, muted: false }, { id: 2, muted: false }];
    const muted = await bulkMute(tabs);
    assert.equal(muted, true);
    assert.deepEqual(calls.tabsUpdate, [
      { tabId: 1, changes: { muted: true } },
      { tabId: 2, changes: { muted: true } },
    ]);
  });

  test("unmutes every tab when all of them are already muted", async () => {
    const { calls } = installChromeMock();
    const tabs = [{ id: 1, muted: true }, { id: 2, muted: true }];
    const muted = await bulkMute(tabs);
    assert.equal(muted, false);
  });
});

describe("bulkDiscard", () => {
  test("discards every tab it can and returns how many succeeded", async () => {
    installChromeMock({ tabs: [{ id: 1, active: false }, { id: 2, active: true }, { id: 3, active: false }] });
    const succeeded = await bulkDiscard([1, 2, 3]);
    assert.equal(succeeded, 2);
  });
});

describe("discardTab", () => {
  test("discards a background tab and reports success", async () => {
    const { calls } = installChromeMock({ tabs: [{ id: 9, active: false }] });
    const result = await discardTab(9);
    assert.deepEqual(calls.tabsDiscard, [9]);
    assert.equal(result, true);
  });

  test("reports failure when the tab cannot be discarded (e.g. it's active)", async () => {
    installChromeMock({ tabs: [{ id: 9, active: true }] });
    const result = await discardTab(9);
    assert.equal(result, false);
  });
});
