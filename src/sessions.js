// Named "session" snapshots of open tabs, persisted in chrome.storage.local.

const STORAGE_KEY = "tabManagerLiteSessions";

export function createSession(name, tabs, { id, createdAt } = {}) {
  const trimmed = name.trim();
  return {
    id: id ?? crypto.randomUUID(),
    name: trimmed || "Sessão sem nome",
    createdAt: createdAt ?? Date.now(),
    tabs: tabs.map((t) => ({ url: t.url, title: t.title, pinned: !!t.pinned })),
  };
}

export async function listSessions() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || [];
}

export async function saveSession(name, tabs, opts) {
  const session = createSession(name, tabs, opts);
  const sessions = await listSessions();
  await chrome.storage.local.set({ [STORAGE_KEY]: [session, ...sessions] });
  return session;
}

export async function deleteSession(id) {
  const sessions = await listSessions();
  const updated = sessions.filter((s) => s.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  return updated;
}

export async function restoreSession(session) {
  if (!session.tabs.length) return;
  await chrome.windows.create({ url: session.tabs.map((t) => t.url) });
}
