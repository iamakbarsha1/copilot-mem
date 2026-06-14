import type Database from "better-sqlite3";
import type {
  Observation,
  ObservationInsert,
} from "../types/observation.js";
import type {
  SearchResult,
  SearchOptions,
  TimelineEntry,
  TimelineOptions,
  ProjectSummary,
} from "../types/search.js";
import { computeContentHash } from "../utils/content-hash.js";

export function searchObservations(
  db: Database.Database,
  options: SearchOptions,
): SearchResult[] {
  const { query, project, type, limit = 20, offset = 0, dateStart, dateEnd, orderBy = "rank" } = options;

  let sql = `
    SELECT o.id, o.title, o.type, o.project, o.created_at_epoch, rank
    FROM observations_fts fts
    JOIN observations o ON o.id = fts.rowid
    WHERE observations_fts MATCH ?
  `;
  const params: unknown[] = [query];

  if (project) {
    sql += " AND o.project = ?";
    params.push(project);
  }
  if (type) {
    sql += " AND o.type = ?";
    params.push(type);
  }
  if (dateStart) {
    sql += " AND o.created_at_epoch >= ?";
    params.push(dateStart);
  }
  if (dateEnd) {
    sql += " AND o.created_at_epoch <= ?";
    params.push(dateEnd);
  }

  switch (orderBy) {
    case "recent":
      sql += " ORDER BY o.created_at_epoch DESC";
      break;
    case "oldest":
      sql += " ORDER BY o.created_at_epoch ASC";
      break;
    default:
      sql += " ORDER BY rank";
  }

  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params) as SearchResult[];
}

export function getObservationsByIds(
  db: Database.Database,
  ids: number[],
): Observation[] {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(`SELECT * FROM observations WHERE id IN (${placeholders})`)
    .all(...ids) as Observation[];
}

export function getTimeline(
  db: Database.Database,
  options: TimelineOptions = {},
): TimelineEntry[] {
  const { project, anchor_id, before = 5, after = 5, limit = 20 } = options;

  if (anchor_id) {
    const anchor = db
      .prepare("SELECT created_at_epoch FROM observations WHERE id = ?")
      .get(anchor_id) as { created_at_epoch: number } | undefined;

    if (!anchor) return [];

    let sql = `
      SELECT id, title, type, project, created_at, created_at_epoch, subtitle
      FROM observations
      WHERE created_at_epoch BETWEEN ? AND ?
    `;
    const params: unknown[] = [
      anchor.created_at_epoch - before * 86400,
      anchor.created_at_epoch + after * 86400,
    ];

    if (project) {
      sql += " AND project = ?";
      params.push(project);
    }

    sql += " ORDER BY created_at_epoch DESC LIMIT ?";
    params.push(limit);

    return db.prepare(sql).all(...params) as TimelineEntry[];
  }

  let sql = `
    SELECT id, title, type, project, created_at, created_at_epoch, subtitle
    FROM observations
  `;
  const params: unknown[] = [];

  if (project) {
    sql += " WHERE project = ?";
    params.push(project);
  }

  sql += " ORDER BY created_at_epoch DESC LIMIT ?";
  params.push(limit);

  return db.prepare(sql).all(...params) as TimelineEntry[];
}

export function insertObservation(
  db: Database.Database,
  obs: ObservationInsert,
): number {
  const now = new Date();
  const contentHash =
    obs.content_hash ||
    computeContentHash(obs.memory_session_id, obs.title, obs.narrative);

  const result = db
    .prepare(
      `INSERT INTO observations (
        memory_session_id, project, text, type, title, subtitle,
        facts, narrative, concepts, files_read, files_modified,
        prompt_number, discovery_tokens, created_at, created_at_epoch,
        content_hash, generated_by_model, agent_type, agent_id, metadata
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(memory_session_id, content_hash) DO NOTHING`,
    )
    .run(
      obs.memory_session_id,
      obs.project,
      obs.text ?? null,
      obs.type,
      obs.title,
      obs.subtitle ?? null,
      obs.facts ?? null,
      obs.narrative,
      obs.concepts ?? null,
      obs.files_read ?? null,
      obs.files_modified ?? null,
      obs.prompt_number ?? null,
      obs.discovery_tokens ?? 0,
      now.toISOString(),
      Math.floor(now.getTime() / 1000),
      contentHash,
      obs.generated_by_model ?? null,
      obs.agent_type ?? null,
      obs.agent_id ?? null,
      obs.metadata ?? null,
    );

  // ON CONFLICT DO NOTHING sets changes=0 but lastInsertRowid may still be non-zero
  return result.changes > 0 ? Number(result.lastInsertRowid) : 0;
}

export function countByProject(
  db: Database.Database,
): ProjectSummary[] {
  const rows = db
    .prepare(
      `SELECT project, type, COUNT(*) as cnt, MAX(created_at_epoch) as latest
       FROM observations
       GROUP BY project, type
       ORDER BY project, type`,
    )
    .all() as Array<{
    project: string;
    type: string;
    cnt: number;
    latest: number;
  }>;

  const map = new Map<string, ProjectSummary>();

  for (const row of rows) {
    let summary = map.get(row.project);
    if (!summary) {
      summary = {
        project: row.project,
        observation_count: 0,
        latest_epoch: 0,
        types: {},
      };
      map.set(row.project, summary);
    }
    summary.observation_count += row.cnt;
    summary.types[row.type] = row.cnt;
    if (row.latest > summary.latest_epoch) {
      summary.latest_epoch = row.latest;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.latest_epoch - a.latest_epoch,
  );
}

export function getProjectContext(
  db: Database.Database,
  project: string,
  limit = 30,
): Observation[] {
  return db
    .prepare(
      `SELECT * FROM observations
       WHERE project = ?
       ORDER BY created_at_epoch DESC
       LIMIT ?`,
    )
    .all(project, limit) as Observation[];
}
