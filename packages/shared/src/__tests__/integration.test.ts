import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { getDbPath, getDb, closeDb, searchObservations, countByProject } from "../index.js";

describe("integration with real claude-mem DB", () => {
  const dbPath = getDbPath();
  const dbExists = existsSync(dbPath);

  it.skipIf(!dbExists)("can open the real DB in readonly mode", () => {
    const db = getDb({ readonly: true, dbPath });
    expect(db.open).toBe(true);

    const version = db
      .prepare("SELECT MAX(version) as v FROM schema_versions")
      .get() as { v: number };
    expect(version.v).toBeGreaterThanOrEqual(32);

    closeDb();
  });

  it.skipIf(!dbExists)("can search observations in real DB", () => {
    const db = getDb({ readonly: true, dbPath });
    const results = searchObservations(db, { query: "project", limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("id");
    expect(results[0]).toHaveProperty("title");
    closeDb();
  });

  it.skipIf(!dbExists)("can count projects in real DB", () => {
    const db = getDb({ readonly: true, dbPath });
    const projects = countByProject(db);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]).toHaveProperty("project");
    expect(projects[0]).toHaveProperty("observation_count");
    closeDb();
  });

  it.skipIf(!dbExists)(
    "content hash matches claude-mem format",
    () => {
      const db = getDb({ readonly: true, dbPath });

      // Get a real observation with a content hash
      const obs = db
        .prepare(
          "SELECT content_hash FROM observations WHERE content_hash IS NOT NULL LIMIT 1",
        )
        .get() as { content_hash: string } | undefined;

      if (obs) {
        expect(obs.content_hash).toMatch(/^[0-9a-f]{16}$/);
      }
      closeDb();
    },
  );
});
