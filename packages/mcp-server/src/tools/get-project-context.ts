import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, getProjectContext } from "@copilot-mem/shared";

const schema = {
  project: z.string().describe("Project name to get context for"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(30)
    .describe("Max observations to return"),
};

export function registerGetProjectContext(server: McpServer) {
  server.tool(
    "get_project_context",
    "Get curated context for a project: recent decisions, bugs, patterns, and discoveries. Useful for onboarding or resuming work.",
    schema,
    async ({ project, limit }) => {
      const db = getDb({ readonly: true });
      const observations = getProjectContext(db, project, limit);

      // Group by type for structured output
      const grouped: Record<string, Array<{ id: number; title: string | null; narrative: string | null }>> = {};
      for (const obs of observations) {
        if (!grouped[obs.type]) grouped[obs.type] = [];
        grouped[obs.type].push({
          id: obs.id,
          title: obs.title,
          narrative: obs.narrative,
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                project,
                total: observations.length,
                by_type: grouped,
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
