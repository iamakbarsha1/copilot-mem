import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { walkDirectory } from "../smart-explore/walker.js";
import { parseFile, isAvailable } from "../smart-explore/parser.js";
import { formatSearchResults } from "../smart-explore/formatter.js";
import type { CodeSymbol, ParsedFile } from "../smart-explore/types.js";

const schema = {
  query: z
    .string()
    .describe(
      "Search term — matches against symbol names, file names, and file content",
    ),
  path: z
    .string()
    .optional()
    .describe("Root directory to search (default: current working directory)"),
  max_results: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum results to return (default: 20)"),
  file_pattern: z
    .string()
    .optional()
    .describe('Substring filter for file paths (e.g. ".ts", "src/services")'),
};

export function registerSmartSearch(server: McpServer) {
  server.tool(
    "smart_search",
    "Search codebase for symbols, functions, classes using tree-sitter AST parsing. Returns folded structural views with token counts. Use path parameter to scope the search.",
    schema,
    async ({ query, path, max_results, file_pattern }) => {
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

      const rootPath = path || process.cwd();
      const files = walkDirectory(rootPath, { filePattern: file_pattern });
      const queryLower = query.toLowerCase();

      const matches: ParsedFile[] = [];
      for (const filePath of files) {
        if (matches.length >= max_results * 2) break;

        const fileNameMatch = filePath.toLowerCase().includes(queryLower);
        const parsed = await parseFile(filePath);
        if (!parsed) continue;

        const symbolMatch = hasMatchingSymbol(parsed.symbols, queryLower);

        if (fileNameMatch || symbolMatch) {
          matches.push(parsed);
        }
      }

      // Symbol matches rank higher than filename-only matches
      matches.sort((a, b) => {
        const aScore = hasMatchingSymbol(a.symbols, queryLower) ? 0 : 1;
        const bScore = hasMatchingSymbol(b.symbols, queryLower) ? 0 : 1;
        return aScore - bScore;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: formatSearchResults(matches, query, max_results),
          },
        ],
      };
    },
  );
}

function hasMatchingSymbol(symbols: CodeSymbol[], query: string): boolean {
  for (const sym of symbols) {
    if (sym.name.toLowerCase().includes(query)) return true;
    if (sym.children && hasMatchingSymbol(sym.children, query)) return true;
  }
  return false;
}
