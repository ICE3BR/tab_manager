// UI state + persistence of user preferences (sort order, duplicate mode) via chrome.storage.local.

const STORAGE_KEY = "tabManagerLitePrefs";

const defaultState = {
  query: "",
  sortBy: "opened", // "opened" | "title" | "domain"
  view: "all", // "all" | "duplicates"
  duplicateMode: "site", // "site" | "url"
  selected: new Set(),
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
  }
  return state;
}

export async function savePrefs(state) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: { sortBy: state.sortBy, duplicateMode: state.duplicateMode },
  });
}
