import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  parseFile,
  findSymbol,
  getSourceForSymbol,
  isAvailable,
} from "../smart-explore/parser.js";
import { formatUnfold } from "../smart-explore/formatter.js";
import type { CodeSymbol } from "../smart-explore/types.js";

const schema = {
  file_path: z.string().describe("Path to the source file"),
  symbol_name: z
    .string()
    .describe(
      "Name of the symbol to unfold (function, class, method, etc.)",
    ),
};

export function registerSmartUnfold(server: McpServer) {
  server.tool(
    "smart_unfold",
    "Expand a specific symbol (function, class, method) from a file. Returns the full source code of just that symbol. Use after smart_search or smart_outline to read specific code.",
    schema,
    async ({ file_path, symbol_name }) => {
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

      const symbol = findSymbol(parsed.symbols, symbol_name);
      if (!symbol) {
        const available = getAllNames(parsed.symbols);
        return {
          content: [
            {
              type: "text" as const,
              text: `Symbol "${symbol_name}" not found in ${file_path}.\nAvailable symbols: ${available.join(", ")}`,
            },
          ],
        };
      }

      const source = getSourceForSymbol(file_path, symbol);
      if (!source) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Could not read source for "${symbol_name}".`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatUnfold(file_path, symbol_name, source, symbol),
          },
        ],
      };
    },
  );
}

function getAllNames(symbols: CodeSymbol[]): string[] {
  const names: string[] = [];
  for (const sym of symbols) {
    names.push(sym.name);
    if (sym.children) names.push(...getAllNames(sym.children));
  }
  return names;
}
