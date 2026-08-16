import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import { findExistingPopupTab, openAsOwnTab, openPopupFromMenu } from "./contextMenu.js";

describe("findExistingPopupTab", () => {
  test("finds a tab whose URL starts with the popup URL", () => {
    const popupUrl = "chrome-extension://abc/popup.html";
    const tabs = [
      { id: 1, url: "https://example.com" },
      { id: 2, url: "chrome-extension://abc/popup.html?tab=true", windowId: 10, index: 3 },
    ];
    const found = findExistingPopupTab(tabs, popupUrl);
    assert.equal(found.id, 2);
  });

  test("returns undefined when no tab matches", () => {
    const found = findExistingPopupTab([{ id: 1, url: "https://example.com" }], "chrome-extension://abc/popup.html");
    assert.equal(found, undefined);
  });
});

describe("openAsOwnTab", () => {
  test("creates a new tab with popup.html?tab=true when none is open yet", async () => {
    const { calls } = installChromeMock({ tabs: [{ id: 1, url: "https://example.com" }], extensionId: "abc" });
    await openAsOwnTab();
    assert.equal(calls.tabsCreate.length, 1);
    assert.equal(calls.tabsCreate[0].url, "chrome-extension://abc/popup.html?tab=true");
  });

  test("focuses the existing tab instead of creating a new one", async () => {
    const { calls } = installChromeMock({
      tabs: [{ id: 1, url: "chrome-extension://abc/popup.html?tab=true", windowId: 10, index: 3 }],
      extensionId: "abc",
    });
    await openAsOwnTab();
    assert.equal(calls.tabsCreate.length, 0);
    assert.deepEqual(calls.windowsUpdate, [{ windowId: 10, props: { focused: true } }]);
    assert.deepEqual(calls.tabsHighlight, [{ windowId: 10, tabs: 3 }]);
  });
});

describe("openPopupFromMenu", () => {
  test("calls chrome.action.openPopup", async () => {
    const { calls } = installChromeMock();
    await openPopupFromMenu();
    assert.equal(calls.actionOpenPopup, 1);
  });
});
