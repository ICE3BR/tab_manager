import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shouldMoveToNewWindow, computeBadgeText } from "./prefs.js";

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

describe("computeBadgeText", () => {
  test("returns the tab count as a string when the badge is enabled", () => {
    assert.equal(computeBadgeText(42, true), "42");
  });

  test("returns an empty string when the badge is disabled", () => {
    assert.equal(computeBadgeText(42, false), "");
  });
});
