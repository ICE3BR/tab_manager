// UI state + persistence of user preferences (sort order, duplicate mode, view, theme) via chrome.storage.local.

const STORAGE_KEY = "tabManagerLitePrefs";

const defaultState = {
  query: "",
  sortBy: "opened", // "opened" | "title" | "domain"
  view: "all", // "all" | "duplicates" | "sessions"
  duplicateMode: "site", // "site" | "url"
  viewMode: "list", // "list" | "grid"
  theme: "dark", // "dark" | "light"
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
    },
  });
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
