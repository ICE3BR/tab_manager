import { groupByWindow } from "./tabs.js";
import { findDuplicates, getHostname } from "./duplicates.js";

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function filterTabs(tabs, query) {
  if (!query.trim()) return tabs;
  const q = query.toLowerCase();
  return tabs.filter(
    (t) => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
  );
}

export function sortTabs(tabs, sortBy) {
  const copy = [...tabs];
  if (sortBy === "title") {
    copy.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === "domain") {
    copy.sort((a, b) => getHostname(a.url).localeCompare(getHostname(b.url)));
  }
  // "opened" keeps the windowId/index order already applied by getAllTabs().
  return copy;
}

function tabRowHtml(tab, selected) {
  const icon = tab.favIconUrl
    ? `<img class="favicon" src="${escapeHtml(tab.favIconUrl)}" alt="" />`
    : `<span class="favicon"></span>`;
  return `
    <div class="tab-row" data-tab-id="${tab.id}">
      <input type="checkbox" class="row-checkbox" data-tab-id="${tab.id}" ${selected ? "checked" : ""} />
      ${icon}
      <div class="info">
        <div class="title">${escapeHtml(tab.title)}</div>
        <div class="url">${escapeHtml(tab.url)}</div>
      </div>
      <div class="row-actions">
        <button class="close-tab-btn" data-tab-id="${tab.id}" title="Fechar aba">✕</button>
      </div>
    </div>`;
}

export function renderAllView(listEl, tabs, state) {
  if (tabs.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhuma aba encontrada.</div>`;
    return;
  }
  const byWindow = groupByWindow(tabs);
  let html = "";
  let windowIndex = 1;
  for (const [, windowTabs] of byWindow) {
    html += `<div class="window-group-header">Janela ${windowIndex++} · ${windowTabs.length} aba(s)</div>`;
    for (const tab of windowTabs) {
      html += tabRowHtml(tab, state.selected.has(tab.id));
    }
  }
  listEl.innerHTML = html;
}

export function renderDuplicatesView(listEl, tabs, state) {
  const groups = findDuplicates(tabs, state.duplicateMode);
  if (groups.length === 0) {
    const label = state.duplicateMode === "url" ? "URLs idênticas" : "sites duplicados";
    listEl.innerHTML = `<div class="empty-state">Nenhuma aba com ${label} encontrada.</div>`;
    return;
  }
  let html = "";
  for (const group of groups) {
    html += `
      <div class="duplicate-group" data-group-key="${escapeHtml(group.key)}">
        <div class="duplicate-group-header">
          <span>${escapeHtml(group.key)}</span>
          <span class="count">${group.tabs.length}</span>
        </div>
        ${group.tabs.map((t) => tabRowHtml(t, state.selected.has(t.id))).join("")}
      </div>`;
  }
  listEl.innerHTML = html;
}

export function render(listEl, tabs, state) {
  const filtered = sortTabs(filterTabs(tabs, state.query), state.sortBy);
  if (state.view === "duplicates") {
    renderDuplicatesView(listEl, filtered, state);
  } else {
    renderAllView(listEl, filtered, state);
  }
}

// Returns the ids of the tabs actually rendered in the current view, used to
// drive the "select all" checkbox and footer counts.
export function visibleTabIdsFor(tabs, state) {
  const filtered = sortTabs(filterTabs(tabs, state.query), state.sortBy);
  if (state.view === "duplicates") {
    return findDuplicates(filtered, state.duplicateMode).flatMap((g) => g.tabs.map((t) => t.id));
  }
  return filtered.map((t) => t.id);
}

export function renderFooter({ selectAllEl, summaryEl, closeSelectedBtn, closeOthersBtn }, state, visibleTabIds) {
  const selectedCount = state.selected.size;
  summaryEl.textContent = `${selectedCount} selecionada${selectedCount === 1 ? "" : "s"}`;
  closeSelectedBtn.disabled = selectedCount === 0;
  closeOthersBtn.disabled = selectedCount !== 1;
  const allVisibleSelected =
    visibleTabIds.length > 0 && visibleTabIds.every((id) => state.selected.has(id));
  selectAllEl.checked = allVisibleSelected;
}
