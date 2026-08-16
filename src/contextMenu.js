// "Open in own tab" / "Open popup" — used by the extension icon's right-click
// context menu (see background.js's setupContextMenus).

export function findExistingPopupTab(tabs, popupUrl) {
  return tabs.find((t) => t.url && t.url.startsWith(popupUrl));
}

export async function openAsOwnTab() {
  const popupUrl = chrome.runtime.getURL("popup.html");
  const tabs = await chrome.tabs.query({});
  const existing = findExistingPopupTab(tabs, popupUrl);

  if (existing) {
    await chrome.windows.update(existing.windowId, { focused: true });
    await chrome.tabs.highlight({ windowId: existing.windowId, tabs: existing.index });
    return;
  }

  await chrome.tabs.create({ url: `${popupUrl}?tab=true` });
}

export async function openPopupFromMenu() {
  if (chrome.action && chrome.action.openPopup) {
    await chrome.action.openPopup();
  }
}
