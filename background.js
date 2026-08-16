import { getAllTabs } from "./src/tabs.js";
import { closeTabs } from "./src/actions.js";
import { computeAutoCloseIds } from "./src/duplicates.js";

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

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "close-duplicate-tabs") return;
  const tabs = await getAllTabs();
  await closeTabs(computeAutoCloseIds(tabs));
});

updateBadge();
