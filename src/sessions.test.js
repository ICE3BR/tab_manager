import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./test-helpers/chromeMock.js";
import {
  createSession,
  saveSession,
  listSessions,
  deleteSession,
  restoreSession,
  exportSessionsJson,
  parseImportedSessions,
  importSessions,
} from "./sessions.js";

describe("createSession", () => {
  test("builds a deterministic session from tabs when id/createdAt are given", () => {
    const tabs = [
      { url: "https://a.com/1", title: "A", pinned: true },
      { url: "https://b.com/2", title: "B", pinned: false },
    ];
    const session = createSession("Trabalho", tabs, { id: "s1", createdAt: 1000 });
    assert.deepEqual(session, {
      id: "s1",
      name: "Trabalho",
      createdAt: 1000,
      tabs: [
        { url: "https://a.com/1", title: "A", pinned: true },
        { url: "https://b.com/2", title: "B", pinned: false },
      ],
    });
  });

  test("falls back to a default name when the given name is blank", () => {
    const session = createSession("   ", [], { id: "s1", createdAt: 1000 });
    assert.equal(session.name, "Sessão sem nome");
  });
});

describe("session storage (chrome.storage.local)", () => {
  test("saveSession persists and listSessions returns newest first", async () => {
    installChromeMock();
    await saveSession("Sessão 1", [{ url: "https://a.com", title: "A" }], { id: "s1", createdAt: 1 });
    await saveSession("Sessão 2", [{ url: "https://b.com", title: "B" }], { id: "s2", createdAt: 2 });

    const sessions = await listSessions();
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].id, "s2");
    assert.equal(sessions[1].id, "s1");
  });

  test("deleteSession removes only the matching session", async () => {
    installChromeMock();
    await saveSession("Sessão 1", [], { id: "s1", createdAt: 1 });
    await saveSession("Sessão 2", [], { id: "s2", createdAt: 2 });

    const remaining = await deleteSession("s1");
    assert.deepEqual(remaining.map((s) => s.id), ["s2"]);
  });
});

describe("restoreSession", () => {
  test("opens a new window with the session's tab URLs", async () => {
    const { calls } = installChromeMock();
    const session = createSession("X", [{ url: "https://a.com" }, { url: "https://b.com" }], {
      id: "s1",
      createdAt: 1,
    });

    await restoreSession(session);

    assert.equal(calls.windowsCreate.length, 1);
    assert.deepEqual(calls.windowsCreate[0].url, ["https://a.com", "https://b.com"]);
  });

  test("does nothing for a session with no tabs", async () => {
    const { calls } = installChromeMock();
    await restoreSession(createSession("Vazia", [], { id: "s1", createdAt: 1 }));
    assert.equal(calls.windowsCreate.length, 0);
  });
});

describe("exportSessionsJson", () => {
  test("serializes sessions to formatted JSON", () => {
    const sessions = [createSession("A", [{ url: "https://a.com", title: "A" }], { id: "s1", createdAt: 1 })];
    const json = exportSessionsJson(sessions);
    assert.deepEqual(JSON.parse(json), sessions);
  });
});

describe("parseImportedSessions", () => {
  test("keeps only entries shaped like a session, regenerating their id", () => {
    const json = JSON.stringify([
      { id: "old-1", name: "Válida", createdAt: 1, tabs: [{ url: "https://a.com", title: "A", pinned: false }] },
      { name: "Sem tabs" },
      "not an object",
    ]);
    const result = parseImportedSessions(json, { makeId: () => "new-id" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "new-id");
    assert.equal(result[0].name, "Válida");
    assert.deepEqual(result[0].tabs, [{ url: "https://a.com", title: "A", pinned: false }]);
  });

  test("returns an empty array for malformed JSON", () => {
    assert.deepEqual(parseImportedSessions("{not json"), []);
  });

  test("returns an empty array when the JSON isn't an array", () => {
    assert.deepEqual(parseImportedSessions(JSON.stringify({ foo: "bar" })), []);
  });
});

describe("importSessions", () => {
  test("merges valid imported sessions in front of the existing ones", async () => {
    installChromeMock();
    await saveSession("Existente", [], { id: "s1", createdAt: 1 });

    const json = JSON.stringify([{ name: "Importada", createdAt: 2, tabs: [{ url: "https://a.com", title: "A" }] }]);
    const result = await importSessions(json, { makeId: () => "imported-id" });

    assert.deepEqual(result.map((s) => s.id), ["imported-id", "s1"]);
  });

  test("leaves storage untouched when nothing valid is imported", async () => {
    installChromeMock();
    await saveSession("Existente", [], { id: "s1", createdAt: 1 });

    const result = await importSessions("not json");

    assert.deepEqual(result.map((s) => s.id), ["s1"]);
  });
});
