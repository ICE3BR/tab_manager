import { getAllTabs } from "./src/tabs.js";
import { closeTabs, closeOthers, focusTab, togglePinned, toggleMuted, discardTab } from "./src/actions.js";
import { createState, loadPrefs, savePrefs, idsInRange, decideEnterAction } from "./src/state.js";
import { render, renderFooter, renderSessionsView, visibleTabIdsFor } from "./src/render.js";
import { saveSession, listSessions, deleteSession, restoreSession } from "./src/sessions.js";
import { mergeAllWindowsInto, moveTabsToNewWindow } from "./src/windows.js";

const state = createState();
let allTabs = [];
let sessions = [];

const el = {
  search: document.getElementById("search"),
  sortBy: document.getElementById("sortBy"),
  mergeWindowsBtn: document.getElementById("mergeWindowsBtn"),
  list: document.getElementById("list"),
  viewTabs: document.querySelectorAll(".view-tab"),
  duplicateModeBar: document.getElementById("duplicateModeBar"),
  modeBtns: document.querySelectorAll("#duplicateModeBar .mode-btn"),
  sessionBar: document.getElementById("sessionBar"),
  sessionName: document.getElementById("sessionName"),
  saveSessionBtn: document.getElementById("saveSessionBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsBar: document.getElementById("settingsBar"),
  viewModeBtns: document.querySelectorAll(".viewmode-btn"),
  themeBtns: document.querySelectorAll(".theme-btn"),
  openOptionsBtn: document.getElementById("openOptionsBtn"),
  selectAll: document.getElementById("selectAll"),
  selectionSummary: document.getElementById("selectionSummary"),
  closeSelectedBtn: document.getElementById("closeSelectedBtn"),
  closeOthersBtn: document.getElementById("closeOthersBtn"),
  statusMsg: document.getElementById("statusMsg"),
  sessionsTabBtn: document.querySelector('.view-tab[data-view="sessions"]'),
};

function applyViewMode() {
  el.list.classList.toggle("view-grid", state.viewMode === "grid");
  for (const b of el.viewModeBtns) b.classList.toggle("active", b.dataset.viewmode === state.viewMode);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  for (const b of el.themeBtns) b.classList.toggle("active", b.dataset.themeOption === state.theme);
}

function applyAppearancePrefs() {
  const root = document.documentElement;
  root.classList.toggle("compact", state.compact);
  root.classList.toggle("no-animations", !state.animations);
  root.classList.toggle("hide-action-buttons", !state.showActionButtons);

  // Popup size only makes sense for the actual small popup, not "open in own tab" mode.
  if (!root.classList.contains("is-tab")) {
    root.style.setProperty("--popup-width", `${state.popupWidth}px`);
    root.style.setProperty("--popup-height", `${state.popupHeight}px`);
  }

  el.sessionsTabBtn.hidden = !state.sessionsEnabled;
  if (!state.sessionsEnabled && state.view === "sessions") {
    el.sessionsTabBtn.classList.remove("active");
  }
}

let statusTimer;
function showStatus(text) {
  el.statusMsg.textContent = text;
  el.statusMsg.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    el.statusMsg.hidden = true;
  }, 2500);
}

function refreshUI() {
  if (state.view === "sessions") {
    renderSessionsView(el.list, sessions);
  } else {
    render(el.list, allTabs, state);
  }
  renderFooter(
    {
      selectAllEl: el.selectAll,
      summaryEl: el.selectionSummary,
      closeSelectedBtn: el.closeSelectedBtn,
      closeOthersBtn: el.closeOthersBtn,
    },
    state,
    state.view === "sessions" ? [] : visibleTabIdsFor(allTabs, state)
  );
}

async function reloadTabs() {
  allTabs = await getAllTabs();
  const liveIds = new Set(allTabs.map((t) => t.id));
  for (const id of [...state.selected]) {
    if (!liveIds.has(id)) state.selected.delete(id);
  }
  refreshUI();
}

el.search.addEventListener("input", () => {
  state.query = el.search.value;
  refreshUI();
});

el.sortBy.addEventListener("change", async () => {
  state.sortBy = el.sortBy.value;
  await savePrefs(state);
  refreshUI();
});

for (const btn of el.viewTabs) {
  btn.addEventListener("click", async () => {
    state.view = btn.dataset.view;
    for (const b of el.viewTabs) {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    }
    el.duplicateModeBar.hidden = state.view !== "duplicates";
    el.sessionBar.hidden = state.view !== "sessions";
    if (state.view === "sessions") {
      sessions = await listSessions();
    }
    refreshUI();
  });
}

el.saveSessionBtn.addEventListener("click", async () => {
  const current = await chrome.windows.getCurrent();
  const tabsInWindow = allTabs.filter((t) => t.windowId === current.id);
  await saveSession(el.sessionName.value, tabsInWindow);
  el.sessionName.value = "";
  sessions = await listSessions();
  refreshUI();
});

el.mergeWindowsBtn.addEventListener("click", async () => {
  const current = await chrome.windows.getCurrent();
  await mergeAllWindowsInto(current.id, allTabs);
  await reloadTabs();
});

for (const btn of el.modeBtns) {
  btn.addEventListener("click", async () => {
    state.duplicateMode = btn.dataset.mode;
    for (const b of el.modeBtns) b.classList.toggle("active", b === btn);
    await savePrefs(state);
    refreshUI();
  });
}

el.settingsBtn.addEventListener("click", () => {
  el.settingsBar.hidden = !el.settingsBar.hidden;
});

for (const btn of el.viewModeBtns) {
  btn.addEventListener("click", async () => {
    state.viewMode = btn.dataset.viewmode;
    applyViewMode();
    await savePrefs(state);
  });
}

for (const btn of el.themeBtns) {
  btn.addEventListener("click", async () => {
    state.theme = btn.dataset.themeOption;
    applyTheme();
    await savePrefs(state);
  });
}

el.openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

el.list.addEventListener("click", async (ev) => {
  const restoreBtn = ev.target.closest(".restore-session-btn");
  if (restoreBtn) {
    ev.stopPropagation();
    const session = sessions.find((s) => s.id === restoreBtn.dataset.sessionId);
    if (session) await restoreSession(session);
    return;
  }

  const deleteSessionBtn = ev.target.closest(".delete-session-btn");
  if (deleteSessionBtn) {
    ev.stopPropagation();
    sessions = await deleteSession(deleteSessionBtn.dataset.sessionId);
    refreshUI();
    return;
  }

  const pinBtn = ev.target.closest(".pin-tab-btn");
  if (pinBtn) {
    ev.stopPropagation();
    const tab = allTabs.find((t) => t.id === Number(pinBtn.dataset.tabId));
    if (tab) {
      await togglePinned(tab);
      await reloadTabs();
    }
    return;
  }

  const muteBtn = ev.target.closest(".mute-tab-btn");
  if (muteBtn) {
    ev.stopPropagation();
    const tab = allTabs.find((t) => t.id === Number(muteBtn.dataset.tabId));
    if (tab) {
      await toggleMuted(tab);
      await reloadTabs();
    }
    return;
  }

  const discardBtn = ev.target.closest(".discard-tab-btn");
  if (discardBtn) {
    ev.stopPropagation();
    const ok = await discardTab(Number(discardBtn.dataset.tabId));
    showStatus(ok ? "Aba suspensa." : "Não foi possível suspender: a aba está ativa ou já suspensa.");
    await reloadTabs();
    return;
  }

  const closeBtn = ev.target.closest(".close-tab-btn");
  if (closeBtn) {
    ev.stopPropagation();
    const id = Number(closeBtn.dataset.tabId);
    state.selected.delete(id);
    await closeTabs([id]);
    return;
  }

  const checkbox = ev.target.closest(".row-checkbox");
  if (checkbox) {
    ev.stopPropagation();
    const id = Number(checkbox.dataset.tabId);
    if (checkbox.checked) state.selected.add(id);
    else state.selected.delete(id);
    state.lastSelectedId = id;
    refreshUI();
    return;
  }

  const row = ev.target.closest(".tab-row");
  if (row) {
    const id = Number(row.dataset.tabId);
    const tab = allTabs.find((t) => t.id === id);
    if (tab) await focusTab(tab);
  }
});

el.list.addEventListener("contextmenu", (ev) => {
  const row = ev.target.closest(".tab-row");
  if (!row) return;
  ev.preventDefault();

  const id = Number(row.dataset.tabId);
  const visibleIds = visibleTabIdsFor(allTabs, state);

  if (ev.shiftKey) {
    for (const rangeId of idsInRange(visibleIds, state.lastSelectedId, id)) {
      state.selected.add(rangeId);
    }
  } else if (state.selected.has(id)) {
    state.selected.delete(id);
  } else {
    state.selected.add(id);
  }
  state.lastSelectedId = id;
  refreshUI();
});

// Chrome starts native autoscroll on middle-button mousedown, before
// auxclick ever fires — has to be prevented here, not in the click handler.
el.list.addEventListener("mousedown", (ev) => {
  if (ev.button === 1 && ev.target.closest(".tab-row")) ev.preventDefault();
});

el.list.addEventListener("auxclick", async (ev) => {
  if (ev.button !== 1) return;
  const row = ev.target.closest(".tab-row");
  if (!row) return;
  ev.preventDefault();
  const id = Number(row.dataset.tabId);
  state.selected.delete(id);
  await closeTabs([id]);
});

document.addEventListener("keydown", async (ev) => {
  if (ev.key !== "Enter") return;
  const target = ev.target;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
  if (state.view === "sessions") return;

  const action = decideEnterAction(state.selected);
  if (action.type === "focus") {
    const tab = allTabs.find((t) => t.id === action.id);
    if (tab) await focusTab(tab);
  } else if (action.type === "moveToNewWindow") {
    await moveTabsToNewWindow(action.ids);
    state.selected.clear();
    await reloadTabs();
  }
});

el.selectAll.addEventListener("change", () => {
  const ids = visibleTabIdsFor(allTabs, state);
  if (el.selectAll.checked) {
    for (const id of ids) state.selected.add(id);
  } else {
    for (const id of ids) state.selected.delete(id);
  }
  refreshUI();
});

el.closeSelectedBtn.addEventListener("click", async () => {
  const ids = [...state.selected];
  state.selected.clear();
  await closeTabs(ids);
});

el.closeOthersBtn.addEventListener("click", async () => {
  const [id] = [...state.selected];
  if (id == null) return;
  await closeOthers(id, allTabs);
});

chrome.tabs.onRemoved.addListener(reloadTabs);
chrome.tabs.onCreated.addListener(reloadTabs);
chrome.tabs.onUpdated.addListener(reloadTabs);

if (new URLSearchParams(location.search).get("tab") === "true") {
  document.documentElement.classList.add("is-tab");
}

(async () => {
  await loadPrefs(state);
  el.sortBy.value = state.sortBy;
  for (const b of el.modeBtns) b.classList.toggle("active", b.dataset.mode === state.duplicateMode);
  applyViewMode();
  applyTheme();
  applyAppearancePrefs();
  await reloadTabs();
})();
