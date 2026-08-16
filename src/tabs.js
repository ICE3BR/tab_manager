// Wraps chrome.tabs access and normalizes the shape used by the rest of the UI.

export async function getAllTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs
    .map((t) => ({
      id: t.id,
      windowId: t.windowId,
      title: t.title || t.url || "Sem título",
      url: t.url || "",
      favIconUrl: t.favIconUrl || "",
      active: !!t.active,
      pinned: !!t.pinned,
      muted: !!(t.mutedInfo && t.mutedInfo.muted),
      index: t.index,
    }))
    .sort((a, b) => a.windowId - b.windowId || a.index - b.index);
}

export function groupByWindow(tabs) {
  const groups = new Map();
  for (const tab of tabs) {
    if (!groups.has(tab.windowId)) groups.set(tab.windowId, []);
    groups.get(tab.windowId).push(tab);
  }
  return groups;
}
