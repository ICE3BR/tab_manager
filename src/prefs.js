// Pure logic backing the Options page: tab-limit-per-window and badge visibility.

export function shouldMoveToNewWindow(currentWindowTabCount, tabLimit) {
  if (!tabLimit) return false;
  return currentWindowTabCount >= tabLimit;
}

// Counts the tabs in a window excluding a specific tab id. Filtering by id
// (rather than assuming the tab is present and subtracting 1) stays correct
// regardless of whether chrome.tabs.query already includes a just-created tab.
export function countTabsExcluding(windowTabs, excludeTabId) {
  return windowTabs.filter((t) => t.id !== excludeTabId).length;
}

export function computeBadgeText(tabCount, badgeEnabled) {
  return badgeEnabled ? String(tabCount) : "";
}

// Orchestrates the tab-limit check for a single newly created tab: queries
// its window, decides via shouldMoveToNewWindow/countTabsExcluding, and
// moves it out to a new window if needed. Takes `tabLimit` as an explicit
// argument (never reads cached/shared state) so the caller is always in
// control of freshness — this is what background.js's tabs.onCreated
// listener calls with a just-loaded pref, avoiding the MV3 service-worker
// cold-start race where a stale cached value would silently skip the check.
export async function applyTabLimit(tab, tabLimit) {
  if (!tabLimit) return false;

  const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });
  const countBeforeThisTab = countTabsExcluding(windowTabs, tab.id);
  if (!shouldMoveToNewWindow(countBeforeThisTab, tabLimit)) return false;

  await chrome.windows.create({ tabId: tab.id });
  return true;
}

const DEFAULT_POPUP_WIDTH = 380;
const DEFAULT_POPUP_HEIGHT = 560;
const POPUP_WIDTH_RANGE = { min: 300, max: 800 };
const POPUP_HEIGHT_RANGE = { min: 400, max: 600 };

function clamp(value, { min, max }, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function clampPopupSize({ width, height }) {
  return {
    width: clamp(width, POPUP_WIDTH_RANGE, DEFAULT_POPUP_WIDTH),
    height: clamp(height, POPUP_HEIGHT_RANGE, DEFAULT_POPUP_HEIGHT),
  };
}

export function incognitoSettingsUrl(extensionId) {
  return `chrome://extensions/?id=${extensionId}`;
}
