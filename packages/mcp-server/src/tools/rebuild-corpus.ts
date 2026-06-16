import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "@copilot-mem/shared";
import {
  loadManifest,
  saveManifest,
  getFilteredObservations,
} from "../corpus/index.js";

const schema = {
  name: z.string().describe("Name of the corpus to rebuild"),
};

export function registerRebuildCorpus(server: McpServer) {
  server.tool(
    "rebuild_corpus",
    "Re-execute a corpus filter to update observation counts. Does NOT reprime the AI session — use reprime_corpus for that.",
    schema,
    async ({ name }) => {
      const manifest = loadManifest(name);
      if (!manifest) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Corpus "${name}" not found.`,
              }),
            },
          ],
        };
      }

      const db = getDb({ readonly: true });
      const observations = getFilteredObservations(db, manifest.filter);

      const oldCount = manifest.observationCount;
      manifest.observationCount = observations.length;
      manifest.updatedAt = new Date().toISOString();
      saveManifest(manifest);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              name,
              previousCount: oldCount,
              newCount: observations.length,
              delta: observations.length - oldCount,
              message: `Corpus "${name}" rebuilt: ${oldCount} → ${observations.length} observations.`,
            }),
          },
        ],
      };
    },
  );
}
