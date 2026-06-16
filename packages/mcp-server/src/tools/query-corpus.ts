import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { querySession, hasSession } from "../corpus/index.js";

const schema = {
  name: z.string().describe("Name of the primed corpus to query"),
  question: z.string().describe("Question to ask about the corpus"),
};

export function registerQueryCorpus(server: McpServer) {
  server.tool(
    "query_corpus",
    "Ask a question about a primed corpus. Requires prime_corpus to have been called first. Uses Anthropic API for AI-powered answers.",
    schema,
    async ({ name, question }) => {
      if (!hasSession(name)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Corpus "${name}" is not primed. Call prime_corpus first.`,
              }),
            },
          ],
        };
      }

      try {
        const answer = await querySession(name, question);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                name,
                question,
                answer,
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
