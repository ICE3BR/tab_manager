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
        <button class="pin-tab-btn ${tab.pinned ? "active" : ""}" data-tab-id="${tab.id}" title="${tab.pinned ? "Desafixar" : "Fixar"}">${tab.pinned ? "📌" : "📍"}</button>
        <button class="mute-tab-btn ${tab.muted ? "active" : ""}" data-tab-id="${tab.id}" title="${tab.muted ? "Reativar som" : "Silenciar"}">${tab.muted ? "🔇" : "🔈"}</button>
        <button class="discard-tab-btn" data-tab-id="${tab.id}" title="Suspender (liberar memória)">💤</button>
        <button class="close-tab-btn" data-tab-id="${tab.id}" title="Fechar aba">✕</button>
      </div>
    </div>`;
}

function sessionRowHtml(session) {
  const date = new Date(session.createdAt).toLocaleString("pt-BR");
  return `
    <div class="session-row" data-session-id="${escapeHtml(session.id)}">
      <div class="info">
        <div class="title">${escapeHtml(session.name)}</div>
        <div class="url">${session.tabs.length} aba(s) · ${escapeHtml(date)}</div>
      </div>
      <div class="row-actions">
        <button class="restore-session-btn" data-session-id="${escapeHtml(session.id)}" title="Restaurar sessão">↺</button>
        <button class="delete-session-btn" data-session-id="${escapeHtml(session.id)}" title="Excluir sessão">✕</button>
      </div>
    </div>`;
}

export function renderSessionsView(listEl, sessions) {
  if (sessions.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhuma sessão salva ainda.</div>`;
    return;
  }
  listEl.innerHTML = sessions.map(sessionRowHtml).join("");
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
