// Merging windows and moving tabs between windows.

export function computeMergePlan(windowsWithTabs, targetWindowId) {
  const moves = [];
  const windowsToClose = [];
  for (const win of windowsWithTabs) {
    if (win.id === targetWindowId) continue;
    for (const tab of win.tabs) {
      moves.push({ tabId: tab.id, targetWindowId });
    }
    windowsToClose.push(win.id);
  }
  return { moves, windowsToClose };
}

export async function mergeAllWindowsInto(targetWindowId, allTabs) {
  const byWindow = new Map();
  for (const tab of allTabs) {
    if (!byWindow.has(tab.windowId)) byWindow.set(tab.windowId, []);
    byWindow.get(tab.windowId).push(tab);
  }
  const windowsWithTabs = [...byWindow.entries()].map(([id, tabs]) => ({ id, tabs }));
  const plan = computeMergePlan(windowsWithTabs, targetWindowId);
  for (const move of plan.moves) {
    await chrome.tabs.move(move.tabId, { windowId: move.targetWindowId, index: -1 });
  }
  return plan;
}

export async function moveTabToWindow(tabId, windowId) {
  await chrome.tabs.move(tabId, { windowId, index: -1 });
}
