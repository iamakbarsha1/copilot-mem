import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "@copilot-mem/shared";
import { saveManifest, getFilteredObservations } from "../corpus/index.js";
import type { CorpusFilter } from "../corpus/index.js";

const schema = {
  name: z.string().describe("Unique name for the corpus"),
  description: z.string().optional().describe("Human-readable description"),
  project: z.string().optional().describe("Filter by project"),
  types: z
    .array(z.string())
    .optional()
    .describe("Filter by observation types"),
  concepts: z.array(z.string()).optional().describe("Filter by concepts"),
  files: z.array(z.string()).optional().describe("Filter by file paths"),
  query: z.string().optional().describe("FTS query filter"),
  dateStart: z.number().optional().describe("Start epoch"),
  dateEnd: z.number().optional().describe("End epoch"),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(200)
    .describe("Max observations in corpus"),
};

export function registerBuildCorpus(server: McpServer) {
  server.tool(
    "build_corpus",
    "Build a named corpus — a filtered view of observations saved as a JSON manifest. Use this to create focused knowledge sets for priming.",
    schema,
    async ({ name, description, project, types, concepts, files, query, dateStart, dateEnd, limit }) => {
      const db = getDb({ readonly: true });

      const filter: CorpusFilter = {
        project,
        types,
        concepts,
        files,
        query,
        dateStart,
        dateEnd,
        limit,
      };

      const observations = getFilteredObservations(db, filter);

      const now = new Date().toISOString();
      saveManifest({
        name,
        description,
        filter,
        observationCount: observations.length,
        createdAt: now,
        updatedAt: now,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              name,
              observationCount: observations.length,
              filter,
              message: `Corpus "${name}" built with ${observations.length} observations. Use prime_corpus to load it into an AI session.`,
            }),
          },
        ],
      };
    },
  );
}
