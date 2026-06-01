import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Session, SessionInsert, PlatformSource } from "../types/session.js";

export function createSession(
  db: Database.Database,
  insert: SessionInsert,
): Session {
  const now = new Date();
  const contentSessionId = insert.content_session_id || randomUUID();
  const memorySessionId = insert.memory_session_id || randomUUID();

  db.prepare(
    `INSERT INTO sdk_sessions (
      content_session_id, memory_session_id, project,
      user_prompt, started_at, started_at_epoch,
      status, platform_source, custom_title
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(
    contentSessionId,
    memorySessionId,
    insert.project,
    insert.user_prompt ?? null,
    now.toISOString(),
    Math.floor(now.getTime() / 1000),
    insert.platform_source,
    insert.custom_title ?? null,
  );

  return getSessionByContentId(db, contentSessionId)!;
}

export function getSessionByContentId(
  db: Database.Database,
  contentSessionId: string,
): Session | null {
  return (
    (db
      .prepare("SELECT * FROM sdk_sessions WHERE content_session_id = ?")
      .get(contentSessionId) as Session | undefined) ?? null
  );
}

export function getSessionByMemoryId(
  db: Database.Database,
  memorySessionId: string,
): Session | null {
  return (
    (db
      .prepare("SELECT * FROM sdk_sessions WHERE memory_session_id = ?")
      .get(memorySessionId) as Session | undefined) ?? null
  );
}

export function getOrCreateSession(
  db: Database.Database,
  project: string,
  platformSource: PlatformSource = "copilot",
): Session {
  // Find an active session for this project from this platform
  const existing = db
    .prepare(
      `SELECT * FROM sdk_sessions
       WHERE project = ? AND platform_source = ? AND status = 'active'
       ORDER BY started_at_epoch DESC LIMIT 1`,
    )
    .get(project, platformSource) as Session | undefined;

  if (existing) return existing;

  return createSession(db, {
    content_session_id: randomUUID(),
    memory_session_id: randomUUID(),
    project,
    platform_source: platformSource,
  });
}

export function completeSession(
  db: Database.Database,
  memorySessionId: string,
): void {
  const now = new Date();
  db.prepare(
    `UPDATE sdk_sessions
     SET status = 'completed', completed_at = ?, completed_at_epoch = ?
     WHERE memory_session_id = ?`,
  ).run(now.toISOString(), Math.floor(now.getTime() / 1000), memorySessionId);
}
