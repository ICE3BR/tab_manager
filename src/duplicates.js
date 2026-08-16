// Duplicate-detection logic: groups tabs either by site (hostname) or by exact full URL.

export function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Normalizes a URL for exact-match comparison: drops the fragment (#...) and
// a single trailing slash, since those don't represent a different resource.
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    let normalized = u.toString();
    if (normalized.endsWith("/") && u.pathname === "/" && !u.search) {
      // keep bare origin slash as-is
    } else if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

function buildGroups(tabs, keyFn) {
  const map = new Map();
  for (const tab of tabs) {
    const key = keyFn(tab);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(tab);
  }
  return [...map.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, tabs: group }));
}

export function groupBySite(tabs) {
  return buildGroups(tabs, (t) => getHostname(t.url));
}

export function groupByExactUrl(tabs) {
  return buildGroups(tabs, (t) => normalizeUrl(t.url));
}

export function findDuplicates(tabs, mode) {
  return mode === "url" ? groupByExactUrl(tabs) : groupBySite(tabs);
}

// Keeps the most recently opened tab (highest id) in a duplicate group and
// returns the ids of the rest, to be closed.
export function idsToCloseKeepingOne(group) {
  if (group.tabs.length < 2) return [];
  const survivor = group.tabs.reduce((a, b) => (b.id > a.id ? b : a));
  return group.tabs.filter((t) => t.id !== survivor.id).map((t) => t.id);
}

// Used by the "close-duplicate-tabs" keyboard shortcut: auto-closes every
// exact-URL duplicate across all open tabs, keeping one of each.
export function computeAutoCloseIds(tabs) {
  return groupByExactUrl(tabs).flatMap((group) => idsToCloseKeepingOne(group));
}
