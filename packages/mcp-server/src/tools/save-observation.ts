import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getDb,
  insertObservation,
  getOrCreateSession,
} from "@copilot-mem/shared";

const schema = {
  project: z.string().describe("Project name"),
  type: z
    .enum([
      "bugfix",
      "change",
      "decision",
      "discovery",
      "feature",
      "refactor",
      "security_alert",
    ])
    .describe("Observation type"),
  title: z.string().describe("Short title for the observation"),
  narrative: z
    .string()
    .describe("Detailed narrative description of what was observed/done"),
  subtitle: z.string().optional().describe("Optional subtitle"),
  facts: z.string().optional().describe("Key facts extracted"),
  concepts: z.string().optional().describe("Related concepts"),
  files_read: z.string().optional().describe("Comma-separated file paths read"),
  files_modified: z
    .string()
    .optional()
    .describe("Comma-separated file paths modified"),
};

export function registerSaveObservation(server: McpServer) {
  server.tool(
    "save_observation",
    "Save a new observation to the shared memory database. Automatically handles session creation and content deduplication.",
    schema,
    async ({
      project,
      type,
      title,
      narrative,
      subtitle,
      facts,
      concepts,
      files_read,
      files_modified,
    }) => {
      const db = getDb();
      const session = getOrCreateSession(db, project, "copilot");

      const id = insertObservation(db, {
        memory_session_id: session.memory_session_id!,
        project,
        type,
        title,
        narrative,
        subtitle,
        facts,
        concepts,
        files_read,
        files_modified,
        agent_type: "copilot",
      });

      const wasDeduped = id === 0;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                id: wasDeduped ? null : id,
                deduplicated: wasDeduped,
                session_id: session.memory_session_id,
                message: wasDeduped
                  ? "Observation already exists (content hash match)"
                  : `Observation saved with ID ${id}`,
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
