import { getAllTabs } from "./src/tabs.js";
import { closeTabs, closeOthers, focusTab } from "./src/actions.js";
import { createState, loadPrefs, savePrefs } from "./src/state.js";
import { render, renderFooter, visibleTabIdsFor } from "./src/render.js";

const state = createState();
let allTabs = [];

const el = {
  search: document.getElementById("search"),
  sortBy: document.getElementById("sortBy"),
  list: document.getElementById("list"),
  viewTabs: document.querySelectorAll(".view-tab"),
  duplicateModeBar: document.getElementById("duplicateModeBar"),
  modeBtns: document.querySelectorAll(".mode-btn"),
  selectAll: document.getElementById("selectAll"),
  selectionSummary: document.getElementById("selectionSummary"),
  closeSelectedBtn: document.getElementById("closeSelectedBtn"),
  closeOthersBtn: document.getElementById("closeOthersBtn"),
};

function refreshUI() {
  render(el.list, allTabs, state);
  renderFooter(
    {
      selectAllEl: el.selectAll,
      summaryEl: el.selectionSummary,
      closeSelectedBtn: el.closeSelectedBtn,
      closeOthersBtn: el.closeOthersBtn,
    },
    state,
    visibleTabIdsFor(allTabs, state)
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
  btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    for (const b of el.viewTabs) {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    }
    el.duplicateModeBar.hidden = state.view !== "duplicates";
    refreshUI();
  });
}

for (const btn of el.modeBtns) {
  btn.addEventListener("click", async () => {
    state.duplicateMode = btn.dataset.mode;
    for (const b of el.modeBtns) b.classList.toggle("active", b === btn);
    await savePrefs(state);
    refreshUI();
  });
}

el.list.addEventListener("click", async (ev) => {
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

(async () => {
  await loadPrefs(state);
  el.sortBy.value = state.sortBy;
  for (const b of el.modeBtns) b.classList.toggle("active", b.dataset.mode === state.duplicateMode);
  await reloadTabs();
})();
