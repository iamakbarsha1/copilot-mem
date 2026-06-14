import type Database from "better-sqlite3";
import type { SessionSummary, SessionSummaryOptions } from "../types/session-summary.js";

export function getSessionSummaries(
  db: Database.Database,
  options: SessionSummaryOptions = {},
): SessionSummary[] {
  const { project, limit = 10, offset = 0 } = options;

  let sql = `SELECT * FROM session_summaries`;
  const params: unknown[] = [];

  if (project) {
    sql += " WHERE project = ?";
    params.push(project);
  }

  sql += " ORDER BY created_at_epoch DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params) as SessionSummary[];
}

export function searchSessionSummaries(
  db: Database.Database,
  query: string,
  options: { project?: string; limit?: number } = {},
): SessionSummary[] {
  const { project, limit = 10 } = options;

  let sql = `
    SELECT s.*
    FROM session_summaries_fts fts
    JOIN session_summaries s ON s.id = fts.rowid
    WHERE session_summaries_fts MATCH ?
  `;
  const params: unknown[] = [query];

  if (project) {
    sql += " AND s.project = ?";
    params.push(project);
  }

  sql += " ORDER BY rank LIMIT ?";
  params.push(limit);

  return db.prepare(sql).all(...params) as SessionSummary[];
}
