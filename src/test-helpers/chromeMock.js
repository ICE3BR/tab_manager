// Minimal in-memory stand-in for the chrome.* extension APIs used by src/*,
// so unit/integration tests can run under plain Node without a browser.

export function installChromeMock({ tabs = [], windows = [] } = {}) {
  const calls = { tabsUpdate: [], tabsMove: [], tabsDiscard: [], tabsRemove: [], windowsRemove: [], windowsCreate: [] };
  let storageLocal = {};

  const chrome = {
    tabs: {
      async query() {
        return tabs;
      },
      async update(tabId, changes) {
        calls.tabsUpdate.push({ tabId, changes });
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) Object.assign(tab, changes);
        return tab;
      },
      async move(tabId, moveProps) {
        calls.tabsMove.push({ tabId, moveProps });
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) tab.windowId = moveProps.windowId;
        return tab;
      },
      async discard(tabId) {
        calls.tabsDiscard.push(tabId);
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) return undefined;
        // Chrome silently refuses to discard the active tab: it returns the
        // tab unchanged instead of throwing.
        if (tab.active) return tab;
        tab.discarded = true;
        return tab;
      },
      async remove(ids) {
        const list = Array.isArray(ids) ? ids : [ids];
        calls.tabsRemove.push(list);
      },
      async create() {},
    },
    windows: {
      async getAll() {
        return windows;
      },
      async remove(windowId) {
        calls.windowsRemove.push(windowId);
      },
      async create(props) {
        calls.windowsCreate.push(props);
        return { id: 9999 };
      },
      async update() {},
    },
    storage: {
      local: {
        async get(key) {
          if (key == null) return { ...storageLocal };
          return { [key]: storageLocal[key] };
        },
        async set(items) {
          storageLocal = { ...storageLocal, ...items };
        },
      },
    },
    action: {
      async setBadgeText() {},
      async setBadgeBackgroundColor() {},
    },
    runtime: {
      onStartup: { addListener() {} },
      onInstalled: { addListener() {} },
    },
    commands: {
      onCommand: { addListener() {} },
    },
  };

  globalThis.chrome = chrome;
  return { chrome, calls };
}
