import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { parseFile, isAvailable } from "../smart-explore/parser.js";
import { formatOutline } from "../smart-explore/formatter.js";

const schema = {
  file_path: z.string().describe("Path to the source file"),
};

export function registerSmartOutline(server: McpServer) {
  server.tool(
    "smart_outline",
    "Get structural outline of a file — shows all symbols (functions, classes, methods, types) with signatures but bodies folded. Much cheaper than reading the full file.",
    schema,
    async ({ file_path }) => {
      if (!isAvailable()) {
        return {
          content: [
            {
              type: "text" as const,
              text: "tree-sitter not available. Install tree-sitter and language grammar packages.",
            },
          ],
        };
      }

      const parsed = await parseFile(file_path);
      if (!parsed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Could not parse ${file_path}. Unsupported language or file not found.`,
            },
          ],
        };
      }

      const outline = formatOutline(parsed);
      const outlineTokens = Math.ceil(outline.length / 4);
      const fullTokens = parsed.tokenEstimate;
      const savings =
        fullTokens > 0
          ? ((1 - outlineTokens / fullTokens) * 100).toFixed(0)
          : "0";

      return {
        content: [
          {
            type: "text" as const,
            text:
              outline +
              `\n~${outlineTokens} tokens (${savings}% savings vs full file ~${fullTokens} tokens)`,
          },
        ],
      };
    },
  );
}
