import { createState, loadPrefs, savePrefs } from "./src/state.js";
import { listSessions, exportSessionsJson, importSessions } from "./src/sessions.js";

const el = {
  tabLimit: document.getElementById("tabLimit"),
  windowTitles: document.getElementById("windowTitles"),
  badge: document.getElementById("badge"),
  openInOwnTab: document.getElementById("openInOwnTab"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  sessionsStatus: document.getElementById("sessionsStatus"),
  shortcutsBtn: document.getElementById("shortcutsBtn"),
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

el.windowTitles.addEventListener("change", async () => {
  state.windowTitles = el.windowTitles.checked;
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

(async () => {
  state = await loadPrefs(state);
  el.tabLimit.value = state.tabLimit;
  el.windowTitles.checked = state.windowTitles;
  el.badge.checked = state.badge;
  el.openInOwnTab.checked = state.openInOwnTab;
})();
