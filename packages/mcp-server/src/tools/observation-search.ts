import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, searchObservations } from "@copilot-mem/shared";

const schema = {
  query: z.string().describe("Search query (FTS5 match syntax)"),
  projectId: z.string().optional().describe("Filter by project name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Max results to return"),
};

export function registerObservationSearch(server: McpServer) {
  server.tool(
    "observation_search",
    "Search observations using full-text search against the local SQLite database. Returns compact index of matching observations.",
    schema,
    async ({ query, projectId, limit }) => {
      const db = getDb({ readonly: true });

      const results = searchObservations(db, {
        query,
        project: projectId,
        limit,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              count: results.length,
              results: results.map((r) => ({
                id: r.id,
                title: r.title,
                type: r.type,
                project: r.project,
                created_at_epoch: r.created_at_epoch,
              })),
            }),
          },
        ],
      };
    },
  );
}
