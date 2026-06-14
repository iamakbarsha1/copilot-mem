import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const WORKFLOW_GUIDE = `# copilot-mem — Memory Search Workflow

copilot-mem gives you access to a persistent memory database shared with Claude Code sessions.
Observations are structured records of decisions, discoveries, bugs, patterns, and changes from past work.

## 3-Layer Search Pattern (MANDATORY)

Always follow this pattern when searching memory:

### Layer 1: search_observations
Search by keywords. Returns compact index (IDs + titles only, ~50 tokens/result).
Use this to find relevant observation IDs.

### Layer 2: get_timeline
Pass an observation ID to see surrounding context — what happened before and after.
Helps understand the sequence of events.

### Layer 3: get_observation_details
Fetch full content for specific IDs. Returns complete narratives, facts, files.
Only fetch what you need — each observation is ~300 tokens.

## Quick Context

- \`get_project_context\` — Get curated recent observations for a project
- \`get_session_summaries\` — Get session-level summaries (investigated/learned/completed/next_steps)
- \`observation_context\` — Auto-select most relevant observations for a query
- \`list_projects\` — See all projects in the database

## Saving Observations

Use \`save_observation\` to record decisions, discoveries, or patterns worth remembering.
Always include a clear title, type, and narrative.

## Key Concepts

- Observations have types: bugfix, change, decision, discovery, feature, refactor, security_alert
- Each observation belongs to a project and session
- Content is deduplicated by hash — safe to save the same thing twice
- The database is shared with Claude Code's claude-mem plugin — you see everything Claude recorded too
`;

export function registerImportant(server: McpServer) {
  server.tool(
    "__IMPORTANT",
    "READ THIS FIRST. Contains the mandatory 3-layer search workflow for using copilot-mem effectively. Always follow this pattern when searching memory.",
    {},
    async () => ({
      content: [{ type: "text" as const, text: WORKFLOW_GUIDE }],
    }),
  );
}
