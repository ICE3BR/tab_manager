import { getAllTabs } from "./src/tabs.js";
import { closeTabs } from "./src/actions.js";
import { computeAutoCloseIds } from "./src/duplicates.js";
import { openAsOwnTab, openPopupFromMenu } from "./src/contextMenu.js";
import { createState, loadPrefs } from "./src/state.js";
import { shouldMoveToNewWindow, computeBadgeText, countTabsExcluding } from "./src/prefs.js";

let prefs = createState();

async function refreshPrefs() {
  prefs = await loadPrefs(createState());
  await chrome.action.setPopup({ popup: prefs.openInOwnTab ? "" : "popup.html" });
  await updateBadge();
}

const MENU_OPEN_OWN_TAB = "open-own-tab";
const MENU_OPEN_POPUP = "open-popup";
const MENU_SHORTCUTS = "open-shortcuts";

async function setupContextMenus() {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({ id: MENU_OPEN_OWN_TAB, title: "📔 Abrir em aba própria", contexts: ["action"] });
  if (chrome.action.openPopup) {
    chrome.contextMenus.create({ id: MENU_OPEN_POPUP, title: "📑 Abrir popup", contexts: ["action"] });
  }
  chrome.contextMenus.create({ id: "sep1", type: "separator", contexts: ["action"] });
  chrome.contextMenus.create({ id: MENU_SHORTCUTS, title: "⌨️ Atalhos de teclado", contexts: ["action"] });

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === MENU_OPEN_OWN_TAB) {
      await openAsOwnTab();
    } else if (info.menuItemId === MENU_OPEN_POPUP) {
      await openPopupFromMenu();
    } else if (info.menuItemId === MENU_SHORTCUTS) {
      await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  });
}

// Keeps the toolbar icon badge showing the total number of open tabs.

async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  await chrome.action.setBadgeText({ text: computeBadgeText(tabs.length, prefs.badge) });
}

chrome.action.setBadgeBackgroundColor({ color: "#2f6fed" });

chrome.tabs.onCreated.addListener(async (tab) => {
  // Don't trust the module-level `prefs` cache here: MV3 service workers are
  // killed after ~30s idle and restart on the next event, so the tab that
  // wakes the worker up can run before refreshPrefs()'s async load resolves,
  // silently skipping the limit for exactly one tab. Load fresh every time.
  const currentPrefs = await loadPrefs(createState());
  if (currentPrefs.tabLimit) {
    const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });
    const countBeforeThisTab = countTabsExcluding(windowTabs, tab.id);
    if (shouldMoveToNewWindow(countBeforeThisTab, currentPrefs.tabLimit)) {
      await chrome.windows.create({ tabId: tab.id });
    }
  }
  prefs = currentPrefs;
  await updateBadge();
});
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onAttached.addListener(updateBadge);
chrome.tabs.onDetached.addListener(updateBadge);
chrome.runtime.onStartup.addListener(refreshPrefs);
chrome.runtime.onInstalled.addListener(refreshPrefs);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.tabManagerLitePrefs) refreshPrefs();
});

// Only fires when there's no default_popup set (i.e. "open in own tab" is on).
chrome.action.onClicked.addListener(openAsOwnTab);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "close-duplicate-tabs") return;
  const tabs = await getAllTabs();
  await closeTabs(computeAutoCloseIds(tabs));
});

await refreshPrefs();
setupContextMenus();
