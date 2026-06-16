import type Database from "better-sqlite3";
import type { CorpusFilter } from "./types.js";

interface FilteredObs {
  id: number;
  title: string | null;
  type: string;
  project: string;
  narrative: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  created_at_epoch: number;
}

export function getFilteredObservations(
  db: Database.Database,
  filter: CorpusFilter,
): FilteredObs[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.project) {
    conditions.push("o.project = ?");
    params.push(filter.project);
  }

  if (filter.types && filter.types.length > 0) {
    const placeholders = filter.types.map(() => "?").join(",");
    conditions.push(`o.type IN (${placeholders})`);
    params.push(...filter.types);
  }

  if (filter.dateStart) {
    conditions.push("o.created_at_epoch >= ?");
    params.push(filter.dateStart);
  }

  if (filter.dateEnd) {
    conditions.push("o.created_at_epoch <= ?");
    params.push(filter.dateEnd);
  }

  if (filter.concepts && filter.concepts.length > 0) {
    const conceptConditions = filter.concepts.map(() => "o.concepts LIKE ?");
    conditions.push(`(${conceptConditions.join(" OR ")})`);
    params.push(...filter.concepts.map((c) => `%${c}%`));
  }

  if (filter.files && filter.files.length > 0) {
    const fileConditions = filter.files.map(
      () => "(o.files_read LIKE ? OR o.files_modified LIKE ?)",
    );
    conditions.push(`(${fileConditions.join(" OR ")})`);
    for (const f of filter.files) {
      params.push(`%${f}%`, `%${f}%`);
    }
  }

  // If query provided, use FTS
  if (filter.query) {
    let sql = `
      SELECT o.id, o.title, o.type, o.project, o.narrative,
             o.concepts, o.files_read, o.files_modified, o.created_at_epoch
      FROM observations_fts fts
      JOIN observations o ON o.id = fts.rowid
      WHERE observations_fts MATCH ?
    `;
    const ftsParams: unknown[] = [filter.query];

    for (let i = 0; i < conditions.length; i++) {
      sql += ` AND ${conditions[i]}`;
      ftsParams.push(params[i]);
    }

    sql += " ORDER BY rank LIMIT ?";
    ftsParams.push(filter.limit ?? 200);

    return db.prepare(sql).all(...ftsParams) as FilteredObs[];
  }

  // No FTS query — plain SQL
  let sql = `
    SELECT o.id, o.title, o.type, o.project, o.narrative,
           o.concepts, o.files_read, o.files_modified, o.created_at_epoch
    FROM observations o
  `;

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += " ORDER BY o.created_at_epoch DESC LIMIT ?";
  params.push(filter.limit ?? 200);

  return db.prepare(sql).all(...params) as FilteredObs[];
}
