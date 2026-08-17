import { createState, loadPrefs, savePrefs } from "./src/state.js";
import { listSessions, exportSessionsJson, importSessions } from "./src/sessions.js";
import { clampPopupSize, incognitoSettingsUrl } from "./src/prefs.js";

const el = {
  tabLimit: document.getElementById("tabLimit"),
  popupWidth: document.getElementById("popupWidth"),
  popupHeight: document.getElementById("popupHeight"),
  darkMode: document.getElementById("darkMode"),
  compact: document.getElementById("compact"),
  animations: document.getElementById("animations"),
  windowTitles: document.getElementById("windowTitles"),
  sessionsEnabled: document.getElementById("sessionsEnabled"),
  badge: document.getElementById("badge"),
  openInOwnTab: document.getElementById("openInOwnTab"),
  showActionButtons: document.getElementById("showActionButtons"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  sessionsStatus: document.getElementById("sessionsStatus"),
  shortcutsBtn: document.getElementById("shortcutsBtn"),
  incognitoBtn: document.getElementById("incognitoBtn"),
};

let state = createState();

async function save() {
  await savePrefs(state);
}

el.tabLimit.addEventListener("change", async () => {
  state.tabLimit = Math.max(0, Number(el.tabLimit.value) || 0);
  el.tabLimit.value = state.tabLimit;
  await save();
});

el.popupWidth.addEventListener("change", async () => {
  const { width } = clampPopupSize({ width: el.popupWidth.value, height: state.popupHeight });
  state.popupWidth = width;
  el.popupWidth.value = width;
  await save();
});

el.popupHeight.addEventListener("change", async () => {
  const { height } = clampPopupSize({ width: state.popupWidth, height: el.popupHeight.value });
  state.popupHeight = height;
  el.popupHeight.value = height;
  await save();
});

el.darkMode.addEventListener("change", async () => {
  state.theme = el.darkMode.checked ? "dark" : "light";
  await save();
});

el.compact.addEventListener("change", async () => {
  state.compact = el.compact.checked;
  await save();
});

el.animations.addEventListener("change", async () => {
  state.animations = el.animations.checked;
  await save();
});

el.windowTitles.addEventListener("change", async () => {
  state.windowTitles = el.windowTitles.checked;
  await save();
});

el.sessionsEnabled.addEventListener("change", async () => {
  state.sessionsEnabled = el.sessionsEnabled.checked;
  await save();
});

el.badge.addEventListener("change", async () => {
  state.badge = el.badge.checked;
  await save();
});

el.openInOwnTab.addEventListener("change", async () => {
  state.openInOwnTab = el.openInOwnTab.checked;
  await save();
});

el.showActionButtons.addEventListener("change", async () => {
  state.showActionButtons = el.showActionButtons.checked;
  await save();
});

el.exportBtn.addEventListener("click", async () => {
  const sessions = await listSessions();
  const json = exportSessionsJson(sessions);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "tab-manager-lite-sessions.json";
  link.click();
  URL.revokeObjectURL(url);

  el.sessionsStatus.textContent = `${sessions.length} sessão(ões) exportada(s).`;
});

el.importInput.addEventListener("change", async () => {
  const file = el.importInput.files[0];
  if (!file) return;
  const text = await file.text();
  const merged = await importSessions(text);
  el.sessionsStatus.textContent = `Importação concluída. Total de sessões salvas: ${merged.length}.`;
  el.importInput.value = "";
});

el.shortcutsBtn.addEventListener("click", async () => {
  await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

el.incognitoBtn.addEventListener("click", async () => {
  await chrome.tabs.create({ url: incognitoSettingsUrl(chrome.runtime.id) });
});

(async () => {
  state = await loadPrefs(state);
  el.tabLimit.value = state.tabLimit;
  el.popupWidth.value = state.popupWidth;
  el.popupHeight.value = state.popupHeight;
  el.darkMode.checked = state.theme === "dark";
  el.compact.checked = state.compact;
  el.animations.checked = state.animations;
  el.windowTitles.checked = state.windowTitles;
  el.sessionsEnabled.checked = state.sessionsEnabled;
  el.badge.checked = state.badge;
  el.openInOwnTab.checked = state.openInOwnTab;
  el.showActionButtons.checked = state.showActionButtons;
})();
