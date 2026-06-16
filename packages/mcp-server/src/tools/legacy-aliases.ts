import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getDb,
  insertObservation,
  getOrCreateSession,
  searchObservations,
  getObservationsByIds,
  getSessionSummaries,
  getProjectName,
} from "@copilot-mem/shared";

export function registerMemoryAdd(server: McpServer) {
  server.tool(
    "memory_add",
    "Legacy alias for observation_add. Add a memory entry with title and narrative.",
    {
      title: z.string().describe("Title for the memory"),
      narrative: z.string().describe("Detailed narrative content"),
      projectId: z.string().optional().describe("Project name (auto-detected if omitted)"),
      kind: z
        .enum(["bugfix", "change", "decision", "discovery", "feature", "refactor", "security_alert"])
        .optional()
        .default("discovery")
        .describe("Observation type"),
    },
    async ({ title, narrative, projectId, kind }) => {
      const db = getDb();
      const project = projectId || getProjectName();
      const session = getOrCreateSession(db, project, "copilot");

      const id = insertObservation(db, {
        memory_session_id: session.memory_session_id!,
        project,
        type: kind,
        title,
        narrative,
        agent_type: "copilot",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              id: id === 0 ? null : id,
              deduplicated: id === 0,
            }),
          },
        ],
      };
    },
  );
}

export function registerMemorySearch(server: McpServer) {
  server.tool(
    "memory_search",
    "Legacy alias for observation_search. Search memories by keyword.",
    {
      query: z.string().describe("Search query"),
      projectId: z.string().optional().describe("Filter by project"),
      limit: z.number().min(1).max(100).optional().default(20).describe("Max results"),
    },
    async ({ query, projectId, limit }) => {
      const db = getDb({ readonly: true });

      const results = searchObservations(db, {
        query,
        project: projectId,
        limit,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              count: results.length,
              results: results.map((r) => ({
                id: r.id,
                title: r.title,
                type: r.type,
                project: r.project,
                created_at_epoch: r.created_at_epoch,
              })),
            }),
          },
        ],
      };
    },
  );
}

export function registerMemoryContext(server: McpServer) {
  server.tool(
    "memory_context",
    "Legacy alias for observation_context. Get pre-joined context for a query.",
    {
      query: z.string().describe("Query to find relevant context"),
      projectId: z.string().optional().describe("Filter by project"),
      limit: z.number().min(1).max(50).optional().default(10).describe("Max observations"),
    },
    async ({ query, projectId, limit }) => {
      const db = getDb({ readonly: true });

      const searchResults = searchObservations(db, {
        query,
        project: projectId,
        limit,
      });
      const ids = searchResults.map((r) => r.id);
      const observations = ids.length > 0 ? getObservationsByIds(db, ids) : [];

      const summaries = getSessionSummaries(db, {
        project: projectId,
        limit: 5,
      });

      const contextParts: string[] = [];

      if (summaries.length > 0) {
        contextParts.push("## Recent Sessions\n");
        for (const s of summaries) {
          const date = new Date(s.created_at_epoch * 1000).toLocaleDateString();
          contextParts.push(`### ${date} — ${s.project}`);
          if (s.request) contextParts.push(`**Request:** ${s.request}`);
          if (s.investigated) contextParts.push(`**Investigated:** ${s.investigated}`);
          if (s.learned) contextParts.push(`**Learned:** ${s.learned}`);
          if (s.completed) contextParts.push(`**Completed:** ${s.completed}`);
          if (s.next_steps) contextParts.push(`**Next Steps:** ${s.next_steps}`);
          contextParts.push("");
        }
      }

      if (observations.length > 0) {
        contextParts.push("## Relevant Observations\n");
        for (const o of observations) {
          contextParts.push(`**[${o.type}] ${o.title}**`);
          if (o.narrative) contextParts.push(o.narrative);
          contextParts.push("");
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              observation_count: observations.length,
              summary_count: summaries.length,
              context: contextParts.join("\n"),
              observation_ids: ids,
            }),
          },
        ],
      };
    },
  );
}
