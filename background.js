import { getAllTabs } from "./src/tabs.js";
import { closeTabs } from "./src/actions.js";
import { computeAutoCloseIds } from "./src/duplicates.js";
import { openAsOwnTab, openPopupFromMenu } from "./src/contextMenu.js";

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
setupContextMenus();
