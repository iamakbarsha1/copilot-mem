import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, searchObservations } from "@copilot-mem/shared";

const schema = {
  query: z.string().describe("Search query for FTS5 full-text search"),
  project: z.string().optional().describe("Filter by project name"),
  type: z
    .enum([
      "bugfix",
      "change",
      "decision",
      "discovery",
      "feature",
      "refactor",
      "security_alert",
    ])
    .optional()
    .describe("Filter by observation type"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Max results to return"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .describe("Offset for pagination"),
  dateStart: z
    .number()
    .optional()
    .describe("Filter: only observations after this Unix epoch (seconds)"),
  dateEnd: z
    .number()
    .optional()
    .describe("Filter: only observations before this Unix epoch (seconds)"),
  orderBy: z
    .enum(["rank", "recent", "oldest"])
    .default("rank")
    .describe("Sort order: rank (relevance), recent, or oldest"),
};

export function registerSearchObservations(server: McpServer) {
  server.tool(
    "search_observations",
    "Search observations using FTS5 full-text search. Returns index with IDs and titles (not full content). Use get_observation_details to fetch full content by ID.",
    schema,
    async ({ query, project, type, limit, offset, dateStart, dateEnd, orderBy }) => {
      const db = getDb({ readonly: true });
      const results = searchObservations(db, { query, project, type, limit, offset, dateStart, dateEnd, orderBy });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: results.length,
                results: results.map((r) => ({
                  id: r.id,
                  title: r.title,
                  type: r.type,
                  project: r.project,
                  created_at_epoch: r.created_at_epoch,
                })),
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
