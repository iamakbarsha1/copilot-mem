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
};

export function registerSearchObservations(server: McpServer) {
  server.tool(
    "search_observations",
    "Search observations using FTS5 full-text search. Returns index with IDs and titles (not full content). Use get_observation_details to fetch full content by ID.",
    schema,
    async ({ query, project, type, limit }) => {
      const db = getDb({ readonly: true });
      const results = searchObservations(db, { query, project, type, limit });

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
