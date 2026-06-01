import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, getObservationsByIds } from "@copilot-mem/shared";

const schema = {
  ids: z
    .array(z.number())
    .min(1)
    .max(50)
    .describe("Array of observation IDs to fetch"),
};

export function registerGetObservationDetails(server: McpServer) {
  server.tool(
    "get_observation_details",
    "Fetch full observation details by ID array. Use after search_observations to get complete content.",
    schema,
    async ({ ids }) => {
      const db = getDb({ readonly: true });
      const observations = getObservationsByIds(db, ids);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              observations.map((o) => ({
                id: o.id,
                type: o.type,
                title: o.title,
                subtitle: o.subtitle,
                narrative: o.narrative,
                facts: o.facts,
                concepts: o.concepts,
                project: o.project,
                files_read: o.files_read,
                files_modified: o.files_modified,
                agent_type: o.agent_type,
                created_at: o.created_at,
              })),
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
