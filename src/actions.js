// Tab-closing / focusing actions, thin wrappers over chrome.tabs.

export async function focusTab(tab) {
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
}

export async function closeTabs(ids) {
  if (ids.length === 0) return;
  await chrome.tabs.remove(ids);
}

export async function closeOthers(keepId, allTabs) {
  const ids = allTabs.filter((t) => t.id !== keepId && !t.pinned).map((t) => t.id);
  await closeTabs(ids);
}

export async function togglePinned(tab) {
  await chrome.tabs.update(tab.id, { pinned: !tab.pinned });
}

export async function toggleMuted(tab) {
  await chrome.tabs.update(tab.id, { muted: !tab.muted });
}

export async function discardTab(id) {
  await chrome.tabs.discard(id);
}
