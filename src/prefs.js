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
