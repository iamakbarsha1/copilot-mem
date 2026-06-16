import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getDb,
  insertObservation,
  getOrCreateSession,
  getProjectName,
} from "@copilot-mem/shared";

const schema = {
  eventType: z.string().describe("Type of event (e.g. 'file_edit', 'test_run', 'deploy')"),
  contentSessionId: z.string().optional().describe("Content session ID"),
  memorySessionId: z.string().optional().describe("Memory session ID"),
  occurredAtEpoch: z.number().optional().describe("When the event occurred (unix epoch)"),
  payload: z.string().optional().describe("JSON payload with event details"),
  projectId: z.string().optional().describe("Project name"),
  sourceType: z.string().optional().default("copilot").describe("Source platform"),
  generate: z.boolean().optional().default(false).describe("Request AI observation generation (not supported in copilot-mem)"),
};

export function registerObservationRecordEvent(server: McpServer) {
  server.tool(
    "observation_record_event",
    "Record a development event as an observation. AI-powered observation generation is not supported — events are stored as change observations directly.",
    schema,
    async ({ eventType, contentSessionId, memorySessionId, occurredAtEpoch, payload, projectId, sourceType, generate }) => {
      const db = getDb();
      const project = projectId || getProjectName();
      const session = getOrCreateSession(db, project, (sourceType as "copilot") || "copilot");

      const title = `Event: ${eventType}`;
      let narrative = `Recorded ${eventType} event`;
      if (payload) {
        try {
          const parsed = JSON.parse(payload);
          narrative += `: ${JSON.stringify(parsed)}`;
        } catch {
          narrative += `: ${payload}`;
        }
      }

      const id = insertObservation(db, {
        memory_session_id: memorySessionId || session.memory_session_id!,
        project,
        type: "change",
        title,
        narrative,
        agent_type: sourceType || "copilot",
        metadata: payload ?? null,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              id: id === 0 ? null : id,
              generation_supported: false,
              message: generate
                ? "Event recorded. AI observation generation is not supported in copilot-mem — use claude-mem for that feature."
                : "Event recorded as observation.",
            }),
          },
        ],
      };
    },
  );
}
