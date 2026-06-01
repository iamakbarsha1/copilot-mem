import Database from "better-sqlite3";
import { homedir } from "os";
import { join, dirname, basename } from "path";
import { existsSync, mkdirSync } from "fs";
import { createHash, randomUUID } from "crypto";
import { execSync } from "child_process";

interface PendingObservation {
  project: string;
  type: string;
  title: string;
  narrative: string;
  files_modified?: string;
  files_read?: string;
}

function computeContentHash(sessionId: string, title: string, narrative: string): string {
  const input = [sessionId, title, narrative].join("\0");
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function getProjectName(cwd?: string): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return basename(gitRoot);
  } catch {
    return basename(cwd || process.cwd());
  }
}

export class ObservationWriter {
  private db: Database.Database | null = null;
  private pending: PendingObservation[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private memorySessionId: string;
  private batchIntervalMs: number;

  constructor(batchIntervalMs = 30000) {
    this.sessionId = randomUUID();
    this.memorySessionId = randomUUID();
    this.batchIntervalMs = batchIntervalMs;
  }

  private getDb(): Database.Database {
    if (this.db?.open) return this.db;

    const dbPath = process.env.CLAUDE_MEM_DATA_DIR
      ? join(process.env.CLAUDE_MEM_DATA_DIR, "claude-mem.db")
      : join(homedir(), ".claude-mem", "claude-mem.db");

    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");

    return this.db;
  }

  private ensureSession(project: string): void {
    const db = this.getDb();
    const existing = db
      .prepare("SELECT 1 FROM sdk_sessions WHERE content_session_id = ?")
      .get(this.sessionId);

    if (!existing) {
      const now = new Date();
      db.prepare(
        `INSERT INTO sdk_sessions (
          content_session_id, memory_session_id, project,
          started_at, started_at_epoch, status, platform_source
        ) VALUES (?, ?, ?, ?, ?, 'active', 'copilot')`,
      ).run(
        this.sessionId,
        this.memorySessionId,
        project,
        now.toISOString(),
        Math.floor(now.getTime() / 1000),
      );
    }
  }

  queue(observation: PendingObservation): void {
    this.pending.push(observation);
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.batchIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    if (this.db?.open) {
      this.db.close();
      this.db = null;
    }
  }

  flush(): number {
    if (this.pending.length === 0) return 0;

    const batch = this.pending.splice(0);
    let written = 0;

    try {
      const db = this.getDb();
      const project = batch[0].project;
      this.ensureSession(project);

      const insert = db.prepare(
        `INSERT INTO observations (
          memory_session_id, project, type, title, narrative,
          files_modified, files_read, created_at, created_at_epoch,
          content_hash, agent_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'copilot')
        ON CONFLICT(memory_session_id, content_hash) DO NOTHING`,
      );

      const writeAll = db.transaction(() => {
        for (const obs of batch) {
          const now = new Date();
          const hash = computeContentHash(
            this.memorySessionId,
            obs.title,
            obs.narrative,
          );
          insert.run(
            this.memorySessionId,
            obs.project,
            obs.type,
            obs.title,
            obs.narrative,
            obs.files_modified ?? null,
            obs.files_read ?? null,
            now.toISOString(),
            Math.floor(now.getTime() / 1000),
            hash,
          );
          written++;
        }
      });

      writeAll();
    } catch (err) {
      console.error("[copilot-mem] flush error:", err);
      // Put failed items back
      this.pending.unshift(...batch);
      written = 0;
    }

    return written;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  static getProjectName = getProjectName;
}
