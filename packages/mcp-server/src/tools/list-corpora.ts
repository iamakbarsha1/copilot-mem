import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listManifests } from "../corpus/index.js";

export function registerListCorpora(server: McpServer) {
  server.tool(
    "list_corpora",
    "List all saved corpus manifests with their filters and observation counts.",
    {},
    async () => {
      const manifests = listManifests();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              count: manifests.length,
              corpora: manifests.map((m) => ({
                name: m.name,
                description: m.description,
                observationCount: m.observationCount,
                createdAt: m.createdAt,
                updatedAt: m.updatedAt,
              })),
            }),
          },
        ],
      };
    },
  );
}
