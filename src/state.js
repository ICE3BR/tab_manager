// UI state + persistence of user preferences (sort order, duplicate mode, view, theme) via chrome.storage.local.

const STORAGE_KEY = "tabManagerLitePrefs";

const defaultState = {
  query: "",
  sortBy: "opened", // "opened" | "title" | "domain"
  view: "all", // "all" | "duplicates" | "sessions"
  duplicateMode: "site", // "site" | "url"
  viewMode: "list", // "list" | "grid"
  theme: "dark", // "dark" | "light"
  tabLimit: 0, // 0 = disabled; otherwise move new tabs to a new window past this count
  windowTitles: true,
  badge: true,
  openInOwnTab: false,
  popupWidth: 380,
  popupHeight: 560,
  compact: false,
  animations: true,
  sessionsEnabled: true,
  showActionButtons: true,
  selected: new Set(),
  lastSelectedId: null,
};

export function createState() {
  return { ...defaultState, selected: new Set() };
}

export async function loadPrefs(state) {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const prefs = stored[STORAGE_KEY];
  if (prefs) {
    if (prefs.sortBy) state.sortBy = prefs.sortBy;
    if (prefs.duplicateMode) state.duplicateMode = prefs.duplicateMode;
    if (prefs.viewMode) state.viewMode = prefs.viewMode;
    if (prefs.theme) state.theme = prefs.theme;
    if (typeof prefs.tabLimit === "number") state.tabLimit = prefs.tabLimit;
    if (typeof prefs.windowTitles === "boolean") state.windowTitles = prefs.windowTitles;
    if (typeof prefs.badge === "boolean") state.badge = prefs.badge;
    if (typeof prefs.openInOwnTab === "boolean") state.openInOwnTab = prefs.openInOwnTab;
    if (typeof prefs.popupWidth === "number") state.popupWidth = prefs.popupWidth;
    if (typeof prefs.popupHeight === "number") state.popupHeight = prefs.popupHeight;
    if (typeof prefs.compact === "boolean") state.compact = prefs.compact;
    if (typeof prefs.animations === "boolean") state.animations = prefs.animations;
    if (typeof prefs.sessionsEnabled === "boolean") state.sessionsEnabled = prefs.sessionsEnabled;
    if (typeof prefs.showActionButtons === "boolean") state.showActionButtons = prefs.showActionButtons;
  }
  return state;
}

export async function savePrefs(state) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      sortBy: state.sortBy,
      duplicateMode: state.duplicateMode,
      viewMode: state.viewMode,
      theme: state.theme,
      tabLimit: state.tabLimit,
      windowTitles: state.windowTitles,
      badge: state.badge,
      openInOwnTab: state.openInOwnTab,
      popupWidth: state.popupWidth,
      popupHeight: state.popupHeight,
      compact: state.compact,
      animations: state.animations,
      sessionsEnabled: state.sessionsEnabled,
      showActionButtons: state.showActionButtons,
    },
  });
}

// Decides what the Enter key should do given the current tab selection:
// focus the single selected tab, move every selected tab to a new window
// when there's more than one, or nothing when the selection is empty.
export function decideEnterAction(selected) {
  if (selected.size === 0) return { type: "none" };
  if (selected.size === 1) return { type: "focus", id: [...selected][0] };
  return { type: "moveToNewWindow", ids: [...selected] };
}

// Returns the ids between `fromId` and `toId` (inclusive), in the order they
// appear in `orderedIds`. Used for shift+right-click range selection. Falls
// back to just `toId` when there's no previous selection to range from.
export function idsInRange(orderedIds, fromId, toId) {
  if (fromId == null) return [toId];
  const fromIndex = orderedIds.indexOf(fromId);
  const toIndex = orderedIds.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1) return [toId];
  const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  return orderedIds.slice(start, end + 1);
}
