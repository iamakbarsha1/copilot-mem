import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, getSessionSummaries, searchSessionSummaries } from "@copilot-mem/shared";

const schema = {
  project: z.string().optional().describe("Filter by project name"),
  query: z.string().optional().describe("Full-text search query for session summaries"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Max results to return"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .describe("Offset for pagination"),
};

export function registerGetSessionSummaries(server: McpServer) {
  server.tool(
    "get_session_summaries",
    "Get session summaries — high-level records of what was investigated, learned, completed, and planned in past sessions. More structured than individual observations.",
    schema,
    async ({ project, query, limit, offset }) => {
      const db = getDb({ readonly: true });

      const summaries = query
        ? searchSessionSummaries(db, query, { project, limit })
        : getSessionSummaries(db, { project, limit, offset });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: summaries.length,
                summaries: summaries.map((s) => ({
                  id: s.id,
                  session_id: s.memory_session_id,
                  project: s.project,
                  request: s.request,
                  investigated: s.investigated,
                  learned: s.learned,
                  completed: s.completed,
                  next_steps: s.next_steps,
                  files_read: s.files_read,
                  files_edited: s.files_edited,
                  notes: s.notes,
                  created_at: new Date(s.created_at_epoch * 1000).toISOString(),
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
