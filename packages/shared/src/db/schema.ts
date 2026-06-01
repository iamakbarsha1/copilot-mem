import type Database from "better-sqlite3";

const CURRENT_SCHEMA_VERSION = 32;

/**
 * Idempotent schema creation matching claude-mem v32.
 * Creates tables, indexes, FTS tables, and triggers if they don't exist.
 */
export function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      id INTEGER PRIMARY KEY,
      version INTEGER UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sdk_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_session_id TEXT UNIQUE NOT NULL,
      memory_session_id TEXT UNIQUE,
      project TEXT NOT NULL,
      user_prompt TEXT,
      started_at TEXT NOT NULL,
      started_at_epoch INTEGER NOT NULL,
      completed_at TEXT,
      completed_at_epoch INTEGER,
      status TEXT CHECK(status IN ('active', 'completed', 'failed')) NOT NULL DEFAULT 'active',
      worker_port INTEGER,
      prompt_counter INTEGER DEFAULT 0,
      custom_title TEXT,
      platform_source TEXT NOT NULL DEFAULT 'claude'
    );

    CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id);
    CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id);
    CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project);
    CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC);
    CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source);

    CREATE TABLE IF NOT EXISTS user_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_session_id TEXT NOT NULL,
      prompt_number INTEGER NOT NULL,
      prompt_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      FOREIGN KEY(content_session_id) REFERENCES sdk_sessions(content_session_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_prompts_claude_session ON user_prompts(content_session_id);
    CREATE INDEX IF NOT EXISTS idx_user_prompts_created ON user_prompts(created_at_epoch DESC);
    CREATE INDEX IF NOT EXISTS idx_user_prompts_prompt_number ON user_prompts(prompt_number);
    CREATE INDEX IF NOT EXISTS idx_user_prompts_lookup ON user_prompts(content_session_id, prompt_number);

    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_session_id TEXT NOT NULL,
      project TEXT NOT NULL,
      text TEXT,
      type TEXT NOT NULL,
      title TEXT,
      subtitle TEXT,
      facts TEXT,
      narrative TEXT,
      concepts TEXT,
      files_read TEXT,
      files_modified TEXT,
      prompt_number INTEGER,
      discovery_tokens INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      content_hash TEXT,
      generated_by_model TEXT,
      relevance_count INTEGER DEFAULT 0,
      merged_into_project TEXT,
      agent_type TEXT,
      agent_id TEXT,
      metadata TEXT,
      FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_observations_sdk_session ON observations(memory_session_id);
    CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
    CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
    CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at_epoch DESC);
    CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch);
    CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project);
    CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type);
    CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id);

    CREATE TABLE IF NOT EXISTS session_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_session_id TEXT NOT NULL,
      project TEXT NOT NULL,
      request TEXT,
      investigated TEXT,
      learned TEXT,
      completed TEXT,
      next_steps TEXT,
      files_read TEXT,
      files_edited TEXT,
      notes TEXT,
      prompt_number INTEGER,
      discovery_tokens INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      merged_into_project TEXT,
      FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
    CREATE INDEX IF NOT EXISTS idx_session_summaries_project ON session_summaries(project);
    CREATE INDEX IF NOT EXISTS idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project);

    CREATE TABLE IF NOT EXISTS pending_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_db_id INTEGER NOT NULL,
      content_session_id TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
      tool_name TEXT,
      tool_input TEXT,
      tool_response TEXT,
      cwd TEXT,
      last_user_message TEXT,
      last_assistant_message TEXT,
      prompt_number INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'processed', 'failed')),
      created_at_epoch INTEGER NOT NULL,
      started_processing_at_epoch INTEGER,
      agent_type TEXT,
      agent_id TEXT,
      tool_use_id TEXT,
      FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id);
    CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status);
    CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id);
  `);

  // Unique indexes need special handling — CREATE UNIQUE INDEX IF NOT EXISTS
  const hasUniqueObsIdx = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='index' AND name='ux_observations_session_hash'",
    )
    .get();
  if (!hasUniqueObsIdx) {
    db.exec(`
      CREATE UNIQUE INDEX ux_observations_session_hash
        ON observations(memory_session_id, content_hash);
    `);
  }

  const hasUniquePendingIdx = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='index' AND name='ux_pending_session_tool'",
    )
    .get();
  if (!hasUniquePendingIdx) {
    db.exec(`
      CREATE UNIQUE INDEX ux_pending_session_tool
        ON pending_messages(content_session_id, tool_use_id)
        WHERE tool_use_id IS NOT NULL;
    `);
  }

  // FTS tables — only create if they don't exist
  const hasFts = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='observations_fts'",
    )
    .get();
  if (!hasFts) {
    db.exec(`
      CREATE VIRTUAL TABLE observations_fts USING fts5(
        title,
        subtitle,
        narrative,
        text,
        facts,
        concepts,
        content='observations',
        content_rowid='id'
      );

      CREATE TRIGGER observations_ai AFTER INSERT ON observations BEGIN
        INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
      END;

      CREATE TRIGGER observations_ad AFTER DELETE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
      END;

      CREATE TRIGGER observations_au AFTER UPDATE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
        INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
      END;
    `);
  }

  const hasUserPromptsFts = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_prompts_fts'",
    )
    .get();
  if (!hasUserPromptsFts) {
    db.exec(`
      CREATE VIRTUAL TABLE user_prompts_fts USING fts5(
        prompt_text,
        content='user_prompts',
        content_rowid='id'
      );

      CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;

      CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
      END;

      CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;
    `);
  }

  const hasSummariesFts = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'",
    )
    .get();
  if (!hasSummariesFts) {
    db.exec(`
      CREATE VIRTUAL TABLE session_summaries_fts USING fts5(
        request,
        investigated,
        learned,
        completed,
        next_steps,
        notes,
        content='session_summaries',
        content_rowid='id'
      );

      CREATE TRIGGER session_summaries_ai AFTER INSERT ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
      END;

      CREATE TRIGGER session_summaries_ad AFTER DELETE ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
      END;

      CREATE TRIGGER session_summaries_au AFTER UPDATE ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
        INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
      END;
    `);
  }

  // Record schema version if not already present
  const hasVersion = db
    .prepare("SELECT 1 FROM schema_versions WHERE version = ?")
    .get(CURRENT_SCHEMA_VERSION);
  if (!hasVersion) {
    db.prepare(
      "INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)",
    ).run(CURRENT_SCHEMA_VERSION, new Date().toISOString());
  }
}

export function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db
      .prepare("SELECT MAX(version) as version FROM schema_versions")
      .get() as { version: number } | undefined;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

export { CURRENT_SCHEMA_VERSION };
