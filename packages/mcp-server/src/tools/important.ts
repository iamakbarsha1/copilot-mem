import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, getProjectName } from "@copilot-mem/shared";
import { generateSessionContext } from "../context/index.js";

const WORKFLOW_GUIDE = `
## 3-Layer Search Pattern (MANDATORY)

Always follow this pattern when searching memory:

### Layer 1: search_observations / observation_search
Search by keywords. Returns compact index (IDs + titles only, ~50 tokens/result).

### Layer 2: get_timeline
Pass an observation ID to see surrounding context — what happened before and after.

### Layer 3: get_observation_details
Fetch full content for specific IDs. Returns complete narratives, facts, files.
Only fetch what you need — each observation is ~300 tokens.

## Quick Context

- \`observation_context\` / \`memory_context\` — Auto-select most relevant observations for a query
- \`get_project_context\` — Get curated recent observations for a project
- \`get_session_summaries\` — Session-level summaries
- \`list_projects\` — See all projects in the database

## Writing Observations

- \`observation_add\` / \`memory_add\` / \`save_observation\` — Record decisions, discoveries, patterns
- \`observation_record_event\` — Record development events

## Corpus System

- \`build_corpus\` → \`prime_corpus\` → \`query_corpus\` — Build filtered knowledge sets and query with AI
- \`list_corpora\` / \`rebuild_corpus\` / \`reprime_corpus\` — Manage corpus lifecycle

## Smart Code Exploration

- \`smart_outline\` — File skeleton with signatures (80%+ token savings)
- \`smart_search\` — AST-aware codebase search
- \`smart_unfold\` — Expand single symbol to full source

## Key Concepts

- Observations have types: bugfix, change, decision, discovery, feature, refactor, security_alert
- Each observation belongs to a project and session
- Content is deduplicated by hash — safe to save the same thing twice
- The database is shared with Claude Code's claude-mem plugin
`;

export function registerImportant(server: McpServer) {
  server.tool(
    "__IMPORTANT",
    "READ THIS FIRST. Returns dynamic session context (recent observations, sessions, context economics) plus the mandatory search workflow. MCP clients should call this first.",
    {},
    async () => {
      let sessionContext: string;
      try {
        const db = getDb({ readonly: true });
        const project = getProjectName();
        sessionContext = generateSessionContext(db, project);
      } catch {
        sessionContext = "[copilot-mem] No project context available (no observations yet or DB not initialized).";
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `# copilot-mem — Session Context\n\n${sessionContext}\n\n---\n${WORKFLOW_GUIDE}`,
          },
        ],
      };
    },
  );
}
