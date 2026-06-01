import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, getTimeline } from "@copilot-mem/shared";

const schema = {
  project: z.string().optional().describe("Filter by project name"),
  anchor_id: z
    .number()
    .optional()
    .describe("Center timeline around this observation ID"),
  before: z
    .number()
    .default(5)
    .describe("Days before anchor to include"),
  after: z
    .number()
    .default(5)
    .describe("Days after anchor to include"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Max results"),
};

export function registerGetTimeline(server: McpServer) {
  server.tool(
    "get_timeline",
    "Get chronological timeline of observations. Optionally anchor around a specific observation ID.",
    schema,
    async ({ project, anchor_id, before, after, limit }) => {
      const db = getDb({ readonly: true });
      const entries = getTimeline(db, {
        project,
        anchor_id,
        before,
        after,
        limit,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: entries.length,
                entries: entries.map((e) => ({
                  id: e.id,
                  title: e.title,
                  type: e.type,
                  project: e.project,
                  created_at: e.created_at,
                  subtitle: e.subtitle,
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
