// Pure logic backing the Options page: tab-limit-per-window and badge visibility.

export function shouldMoveToNewWindow(currentWindowTabCount, tabLimit) {
  if (!tabLimit) return false;
  return currentWindowTabCount >= tabLimit;
}

export function computeBadgeText(tabCount, badgeEnabled) {
  return badgeEnabled ? String(tabCount) : "";
}
