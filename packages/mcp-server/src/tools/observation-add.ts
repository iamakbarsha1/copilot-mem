import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getDb,
  insertObservation,
  getOrCreateSession,
  getProjectName,
} from "@copilot-mem/shared";

const schema = {
  content: z.string().describe("Content of the observation to record"),
  projectId: z.string().optional().describe("Project name (auto-detected from cwd if omitted)"),
  kind: z
    .enum([
      "bugfix",
      "change",
      "decision",
      "discovery",
      "feature",
      "refactor",
      "security_alert",
    ])
    .optional()
    .default("discovery")
    .describe("Observation type"),
  metadata: z.string().optional().describe("Optional JSON metadata string"),
};

export function registerObservationAdd(server: McpServer) {
  server.tool(
    "observation_add",
    "Add a new observation to the memory database. Writes directly to local SQLite — no server-beta API needed.",
    schema,
    async ({ content, projectId, kind, metadata }) => {
      const db = getDb();
      const project = projectId || getProjectName();
      const session = getOrCreateSession(db, project, "copilot");

      // Extract title from first line or first 100 chars
      const firstLine = content.split("\n")[0];
      const title = firstLine.length > 100 ? firstLine.slice(0, 100) + "..." : firstLine;

      const id = insertObservation(db, {
        memory_session_id: session.memory_session_id!,
        project,
        type: kind,
        title,
        narrative: content,
        agent_type: "copilot",
        metadata: metadata ?? null,
      });

      const wasDeduped = id === 0;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              id: wasDeduped ? null : id,
              deduplicated: wasDeduped,
              session_id: session.memory_session_id,
              message: wasDeduped
                ? "Observation already exists (content hash match)"
                : `Observation #${id} saved`,
            }),
          },
        ],
      };
    },
  );
}
