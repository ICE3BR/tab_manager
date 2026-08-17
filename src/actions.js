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

// Returns true if the tab was actually discarded. Chrome silently refuses to
// discard the active tab (and already-discarded tabs stay discarded), so the
// caller needs this signal to tell the user whether anything happened.
export async function discardTab(id) {
  const tab = await chrome.tabs.discard(id);
  return !!(tab && tab.discarded);
}

// Bulk pin/mute for a multi-selection: if every tab in the selection is
// already pinned/muted, undo it for all of them; otherwise apply it to all
// of them. Avoids the ambiguity of toggling each tab independently when the
// selection has mixed states. Returns the state that was applied.
export async function bulkPin(tabs) {
  const pinned = !tabs.every((t) => t.pinned);
  for (const tab of tabs) await chrome.tabs.update(tab.id, { pinned });
  return pinned;
}

export async function bulkMute(tabs) {
  const muted = !tabs.every((t) => t.muted);
  for (const tab of tabs) await chrome.tabs.update(tab.id, { muted });
  return muted;
}

// Discards every given tab id, returning how many actually succeeded (some
// may silently fail, e.g. the active tab — see discardTab).
export async function bulkDiscard(ids) {
  let succeeded = 0;
  for (const id of ids) {
    if (await discardTab(id)) succeeded++;
  }
  return succeeded;
}
