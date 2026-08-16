import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import { getAllTabs, groupByWindow } from "./tabs.js";

describe("getAllTabs", () => {
  test("normalizes muted state from chrome's mutedInfo shape", async () => {
    installChromeMock({
      tabs: [
        { id: 1, windowId: 1, index: 0, title: "A", url: "https://a.com", mutedInfo: { muted: true } },
        { id: 2, windowId: 1, index: 1, title: "B", url: "https://b.com" },
      ],
    });
    const tabs = await getAllTabs();
    assert.equal(tabs[0].muted, true);
    assert.equal(tabs[1].muted, false);
  });

  test("sorts by windowId then index", async () => {
    installChromeMock({
      tabs: [
        { id: 1, windowId: 2, index: 0, title: "A", url: "https://a.com" },
        { id: 2, windowId: 1, index: 1, title: "B", url: "https://b.com" },
        { id: 3, windowId: 1, index: 0, title: "C", url: "https://c.com" },
      ],
    });
    const tabs = await getAllTabs();
    assert.deepEqual(tabs.map((t) => t.id), [3, 2, 1]);
  });
});

describe("groupByWindow", () => {
  test("groups tabs by their windowId preserving order", () => {
    const groups = groupByWindow([
      { id: 1, windowId: 1 },
      { id: 2, windowId: 2 },
      { id: 3, windowId: 1 },
    ]);
    assert.deepEqual([...groups.keys()], [1, 2]);
    assert.deepEqual(groups.get(1).map((t) => t.id), [1, 3]);
  });
});
