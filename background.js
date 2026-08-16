// Keeps the toolbar icon badge showing the total number of open tabs.

async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  const count = tabs.length;
  await chrome.action.setBadgeText({ text: String(count) });
}

chrome.action.setBadgeBackgroundColor({ color: "#2f6fed" });

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onAttached.addListener(updateBadge);
chrome.tabs.onDetached.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);

updateBadge();
