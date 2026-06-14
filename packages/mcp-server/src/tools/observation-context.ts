import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getDb,
  searchObservations,
  getObservationsByIds,
  getSessionSummaries,
} from "@copilot-mem/shared";

const schema = {
  query: z.string().describe("Query to find relevant context (e.g. project name, topic, or question)"),
  project: z.string().optional().describe("Filter by project name"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Max observations to include in context"),
};

export function registerObservationContext(server: McpServer) {
  server.tool(
    "observation_context",
    "Auto-select the most relevant observations and session summaries for a query. Returns pre-joined context ready for prompt injection. Use this for quick project onboarding or resuming work.",
    schema,
    async ({ query, project, limit }) => {
      const db = getDb({ readonly: true });

      // Search observations by relevance
      const searchResults = searchObservations(db, { query, project, limit });
      const ids = searchResults.map((r) => r.id);
      const observations = ids.length > 0 ? getObservationsByIds(db, ids) : [];

      // Get recent session summaries for project context
      const summaries = getSessionSummaries(db, {
        project,
        limit: 5,
      });

      // Build context string
      let contextParts: string[] = [];

      if (summaries.length > 0) {
        contextParts.push("## Recent Sessions\n");
        for (const s of summaries) {
          const date = new Date(s.created_at_epoch * 1000).toLocaleDateString();
          contextParts.push(`### ${date} — ${s.project}`);
          if (s.request) contextParts.push(`**Request:** ${s.request}`);
          if (s.investigated) contextParts.push(`**Investigated:** ${s.investigated}`);
          if (s.learned) contextParts.push(`**Learned:** ${s.learned}`);
          if (s.completed) contextParts.push(`**Completed:** ${s.completed}`);
          if (s.next_steps) contextParts.push(`**Next Steps:** ${s.next_steps}`);
          contextParts.push("");
        }
      }

      if (observations.length > 0) {
        contextParts.push("## Relevant Observations\n");
        for (const o of observations) {
          const icon = {
            bugfix: "●",
            feature: "◆",
            refactor: "↻",
            change: "✓",
            discovery: "○",
            decision: "⚖",
            security_alert: "⚠",
          }[o.type] || "•";

          contextParts.push(`${icon} **[${o.type}] ${o.title}**`);
          if (o.narrative) contextParts.push(o.narrative);
          if (o.facts) contextParts.push(`Facts: ${o.facts}`);
          contextParts.push("");
        }
      }

      const contextText = contextParts.join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                observation_count: observations.length,
                summary_count: summaries.length,
                context: contextText,
                observation_ids: ids,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
