import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "@copilot-mem/shared";
import {
  loadManifest,
  saveManifest,
  getFilteredObservations,
  primeSession,
} from "../corpus/index.js";

const schema = {
  name: z.string().describe("Name of the corpus to rebuild and reprime"),
};

export function registerReprimeCorpus(server: McpServer) {
  server.tool(
    "reprime_corpus",
    "Rebuild the corpus filter AND reprime the AI session with fresh data. Combines rebuild_corpus + prime_corpus.",
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

      // Update manifest
      manifest.observationCount = observations.length;
      manifest.updatedAt = new Date().toISOString();
      saveManifest(manifest);

      try {
        const session = await primeSession(name, observations);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                name,
                observationCount: session.observationCount,
                primedAt: session.primedAt,
                message: `Corpus "${name}" rebuilt and reprimed with ${session.observationCount} observations.`,
              }),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: message,
              }),
            },
          ],
        };
      }
    },
  );
}
