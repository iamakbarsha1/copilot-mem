import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const schema = {
  jobId: z.string().describe("Job ID to check status for"),
};

export function registerObservationGenerationStatus(server: McpServer) {
  server.tool(
    "observation_generation_status",
    "Check the status of an AI observation generation job. copilot-mem does not support async AI generation — this always returns not_supported.",
    schema,
    async ({ jobId }) => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            jobId,
            status: "not_supported",
            message:
              "copilot-mem does not support async AI observation generation. Observations are written directly to SQLite via observation_add or save_observation.",
          }),
        },
      ],
    }),
  );
}
