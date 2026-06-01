import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, countByProject } from "@copilot-mem/shared";

export function registerListProjects(server: McpServer) {
  server.tool(
    "list_projects",
    "List all projects with observation counts and type breakdowns.",
    {},
    async () => {
      const db = getDb({ readonly: true });
      const projects = countByProject(db);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                total_projects: projects.length,
                projects: projects.map((p) => ({
                  name: p.project,
                  observations: p.observation_count,
                  types: p.types,
                  last_activity: new Date(
                    p.latest_epoch * 1000,
                  ).toISOString(),
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
