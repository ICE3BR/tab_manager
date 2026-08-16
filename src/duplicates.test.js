import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getHostname,
  normalizeUrl,
  groupBySite,
  groupByExactUrl,
  idsToCloseKeepingOne,
  computeAutoCloseIds,
} from "./duplicates.js";

describe("existing grouping (Fase 1 regression coverage)", () => {
  test("groupBySite groups tabs by hostname", () => {
    const tabs = [
      { id: 1, url: "https://www.crunchyroll.com/a" },
      { id: 2, url: "https://crunchyroll.com/b" },
      { id: 3, url: "https://example.com" },
    ];
    const groups = groupBySite(tabs);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].key, "crunchyroll.com");
    assert.equal(groups[0].tabs.length, 2);
  });

  test("groupByExactUrl only groups identical URLs", () => {
    const tabs = [
      { id: 1, url: "https://crunchyroll.com/series/GT00378123/tomb-raider-king" },
      { id: 2, url: "https://crunchyroll.com/series/GT00378123/tomb-raider-king" },
      { id: 3, url: "https://crunchyroll.com/series/OTHER/another-show" },
    ];
    const groups = groupByExactUrl(tabs);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].tabs.length, 2);
  });
});

describe("idsToCloseKeepingOne", () => {
  test("keeps the tab with the highest id (most recently opened) and closes the rest", () => {
    const group = { key: "x", tabs: [{ id: 5 }, { id: 2 }, { id: 9 }] };
    assert.deepEqual(idsToCloseKeepingOne(group).sort(), [2, 5]);
  });

  test("returns no ids for a group with a single tab", () => {
    assert.deepEqual(idsToCloseKeepingOne({ key: "x", tabs: [{ id: 1 }] }), []);
  });
});

describe("computeAutoCloseIds", () => {
  test("collects close ids for every exact-URL duplicate group", () => {
    const tabs = [
      { id: 1, url: "https://a.com/x" },
      { id: 2, url: "https://a.com/x" },
      { id: 3, url: "https://b.com/y" },
      { id: 4, url: "https://b.com/y" },
      { id: 5, url: "https://c.com/z" },
    ];
    assert.deepEqual(computeAutoCloseIds(tabs).sort(), [1, 3]);
  });
});
