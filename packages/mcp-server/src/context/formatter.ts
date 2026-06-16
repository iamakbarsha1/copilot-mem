import type Database from "better-sqlite3";

interface ObsRow {
  id: number;
  title: string | null;
  type: string;
  project: string;
  created_at: string;
  created_at_epoch: number;
  discovery_tokens: number;
  memory_session_id: string;
  narrative: string | null;
}

interface SessionRow {
  memory_session_id: string;
  project: string;
  custom_title: string | null;
  started_at_epoch: number;
}

const TYPE_ICONS: Record<string, string> = {
  bugfix: "●",
  feature: "◆",
  refactor: "↻",
  change: "✓",
  discovery: "○",
  decision: "⚖",
  security_alert: "⚠",
  security_note: "⚷",
};

const TYPE_LABELS: Record<string, string> = {
  bugfix: "bugfix",
  feature: "feature",
  refactor: "refactor",
  change: "change",
  discovery: "discovery",
  decision: "decision",
  security_alert: "security_alert",
  security_note: "security_note",
};

function formatTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return `${h}:${m}${ampm}`;
}

function formatDate(epoch: number): string {
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function generateSessionContext(
  db: Database.Database,
  project: string,
  options: { limit?: number } = {},
): string {
  const limit = options.limit ?? 100;
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = now.toLocaleString("en-US", { timeZoneName: "short" }).split(" ").pop() || "";

  // Fetch recent observations for this project
  const observations = db
    .prepare(
      `SELECT id, title, type, project, created_at, created_at_epoch,
              discovery_tokens, memory_session_id, narrative
       FROM observations
       WHERE project = ?
       ORDER BY created_at_epoch DESC
       LIMIT ?`,
    )
    .all(project, limit) as ObsRow[];

  if (observations.length === 0) {
    return `[${project}] No observations found.\n\nUse save_observation or observation_add to start recording context.`;
  }

  // Fetch session summaries
  const sessions = db
    .prepare(
      `SELECT memory_session_id, project, custom_title, started_at_epoch
       FROM sdk_sessions
       WHERE project = ?
       ORDER BY started_at_epoch DESC
       LIMIT 10`,
    )
    .all(project) as SessionRow[];

  const sessionMap = new Map<string, SessionRow>();
  for (const s of sessions) {
    sessionMap.set(s.memory_session_id, s);
  }

  // Calculate context economics
  let readTokens = 0;
  let workTokens = 0;
  for (const o of observations) {
    const titleTokens = estimateTokens(o.title || "");
    const idTokens = 3; // "#12345"
    const metaTokens = 5; // time + type
    readTokens += titleTokens + idTokens + metaTokens;
    workTokens += o.discovery_tokens || estimateTokens(o.narrative || "");
  }
  const savings = workTokens > 0 ? Math.round((1 - readTokens / workTokens) * 100) : 0;

  // Group observations by date
  const byDate = new Map<string, ObsRow[]>();
  for (const o of observations) {
    const dateKey = formatDate(o.created_at_epoch);
    let group = byDate.get(dateKey);
    if (!group) {
      group = [];
      byDate.set(dateKey, group);
    }
    group.push(o);
  }

  // Build output
  const lines: string[] = [];

  lines.push(
    `[${project}] recent context, ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} ${formatTime(Math.floor(now.getTime() / 1000))} ${tzOffset}`,
  );
  lines.push("");

  // Legend
  const usedTypes = new Set(observations.map((o) => o.type));
  const legendParts: string[] = [];
  for (const [type, icon] of Object.entries(TYPE_ICONS)) {
    if (usedTypes.has(type)) {
      legendParts.push(`${icon}${TYPE_LABELS[type] || type}`);
    }
  }
  lines.push(`Legend: ${legendParts.join(" | ")}`);
  lines.push(`Format: ID TIME TYPE TITLE`);
  lines.push("");

  lines.push(
    `Stats: ${observations.length} obs (${readTokens.toLocaleString()}t read) | ${workTokens.toLocaleString()}t work | ${savings}% savings`,
  );
  lines.push("");

  // Observations grouped by date
  for (const [dateStr, obs] of byDate) {
    lines.push(`### ${dateStr}`);

    // Sort by epoch ascending within date
    obs.sort((a, b) => a.created_at_epoch - b.created_at_epoch);

    let prevTime = "";
    for (const o of obs) {
      const time = formatTime(o.created_at_epoch);
      const icon = TYPE_ICONS[o.type] || "•";
      const displayTime = time === prevTime ? '"' : time;
      const title = o.title || "(untitled)";
      lines.push(`${o.id} ${displayTime} ${icon} ${title}`);
      prevTime = time;
    }
    lines.push("");
  }

  // Session summaries
  if (sessions.length > 0) {
    const sessionIds = new Set(observations.map((o) => o.memory_session_id));
    const relevantSessions = sessions.filter((s) =>
      sessionIds.has(s.memory_session_id),
    );
    if (relevantSessions.length > 0) {
      for (const s of relevantSessions.slice(0, 5)) {
        if (s.custom_title) {
          const sessionObs = observations.filter(
            (o) => o.memory_session_id === s.memory_session_id,
          );
          if (sessionObs.length > 0) {
            const firstId = sessionObs[sessionObs.length - 1].id;
            const lastId = sessionObs[0].id;
            lines.push(
              `S${firstId}-${lastId} ${s.custom_title} (${formatDate(s.started_at_epoch)})`,
            );
          }
        }
      }
    }
  }

  lines.push("");
  lines.push(
    `Access ${workTokens.toLocaleString()} tokens of past work via get_observation_details([IDs]) or observation_context.`,
  );

  return lines.join("\n");
}
