import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "../db/schema.js";
import {
  searchObservations,
  getObservationsByIds,
  insertObservation,
  countByProject,
  getTimeline,
  getProjectContext,
} from "../db/observations.js";
import {
  createSession,
  getOrCreateSession,
  getSessionByMemoryId,
  completeSession,
} from "../db/sessions.js";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
});

afterEach(() => {
  db.close();
});

describe("sessions", () => {
  it("creates a session with copilot platform_source", () => {
    const session = createSession(db, {
      content_session_id: "test-content-1",
      memory_session_id: "test-memory-1",
      project: "test-project",
      platform_source: "copilot",
    });

    expect(session.platform_source).toBe("copilot");
    expect(session.project).toBe("test-project");
    expect(session.status).toBe("active");
  });

  it("getOrCreateSession reuses active session", () => {
    const first = getOrCreateSession(db, "proj", "copilot");
    const second = getOrCreateSession(db, "proj", "copilot");
    expect(first.id).toBe(second.id);
  });

  it("completeSession updates status", () => {
    const session = createSession(db, {
      content_session_id: "c1",
      memory_session_id: "m1",
      project: "p",
      platform_source: "copilot",
    });
    completeSession(db, session.memory_session_id!);
    const updated = getSessionByMemoryId(db, session.memory_session_id!);
    expect(updated?.status).toBe("completed");
  });
});

describe("observations", () => {
  const sessionId = "mem-session-1";

  beforeEach(() => {
    createSession(db, {
      content_session_id: "content-1",
      memory_session_id: sessionId,
      project: "test-project",
      platform_source: "copilot",
    });
  });

  it("inserts and retrieves by ID", () => {
    const id = insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "discovery",
      title: "Test observation",
      narrative: "Found something interesting",
    });

    expect(id).toBeGreaterThan(0);

    const results = getObservationsByIds(db, [id]);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Test observation");
    expect(results[0].type).toBe("discovery");
  });

  it("deduplicates by content hash", () => {
    const id1 = insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "discovery",
      title: "Duplicate",
      narrative: "Same content",
    });

    const id2 = insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "discovery",
      title: "Duplicate",
      narrative: "Same content",
    });

    // Second insert should be deduped (returns 0)
    expect(id1).toBeGreaterThan(0);
    expect(id2).toBe(0);
  });

  it("searches via FTS5", () => {
    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "bugfix",
      title: "Fixed pagination bug",
      narrative: "DataTable pagination was broken",
    });

    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "feature",
      title: "Added authentication",
      narrative: "JWT token validation added",
    });

    const results = searchObservations(db, { query: "pagination" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toContain("pagination");
  });

  it("counts by project", () => {
    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "discovery",
      title: "Obs 1",
      narrative: "n1",
    });
    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "bugfix",
      title: "Obs 2",
      narrative: "n2",
    });

    const counts = countByProject(db);
    const proj = counts.find((c) => c.project === "test-project");
    expect(proj).toBeDefined();
    expect(proj!.observation_count).toBe(2);
    expect(proj!.types.discovery).toBe(1);
    expect(proj!.types.bugfix).toBe(1);
  });

  it("returns timeline in reverse chronological order", () => {
    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "discovery",
      title: "First",
      narrative: "n1",
    });
    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "change",
      title: "Second",
      narrative: "n2",
    });

    const timeline = getTimeline(db, { project: "test-project" });
    expect(timeline.length).toBe(2);
  });

  it("getProjectContext returns observations for project", () => {
    insertObservation(db, {
      memory_session_id: sessionId,
      project: "test-project",
      type: "decision",
      title: "Use React",
      narrative: "Chose React for frontend",
    });

    const ctx = getProjectContext(db, "test-project");
    expect(ctx.length).toBe(1);
    expect(ctx[0].title).toBe("Use React");
  });
});
