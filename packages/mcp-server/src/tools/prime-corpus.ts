import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "@copilot-mem/shared";
import {
  loadManifest,
  getFilteredObservations,
  primeSession,
} from "../corpus/index.js";

const schema = {
  name: z.string().describe("Name of the corpus to prime"),
};

export function registerPrimeCorpus(server: McpServer) {
  server.tool(
    "prime_corpus",
    "Load a corpus into an AI-powered session for querying. Requires ANTHROPIC_API_KEY. The primed session is in-memory and lost on restart.",
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
                error: `Corpus "${name}" not found. Use build_corpus to create it first.`,
              }),
            },
          ],
        };
      }

      const db = getDb({ readonly: true });
      const observations = getFilteredObservations(db, manifest.filter);

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
                message: `Corpus "${name}" primed with ${session.observationCount} observations. Use query_corpus to ask questions.`,
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
