# copilot-mem

Bridge GitHub Copilot to [claude-mem](https://github.com/anthropics/claude-mem)'s observation database via MCP.

8000+ observations from Claude Code sessions — decisions, bugfixes, discoveries, patterns — now available to GitHub Copilot.

## Quick Start

### Copilot CLI / VS Code (stdio)

```bash
npx copilot-mem setup
```

This adds `copilot-mem` to `~/.copilot/mcp-config.json`.

### Manual Configuration

Add to your MCP client config:

```json
{
  "mcpServers": {
    "copilot-mem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "copilot-mem"]
    }
  }
}
```

### Claude Code

```json
{
  "mcpServers": {
    "copilot-mem": {
      "command": "npx",
      "args": ["-y", "copilot-mem"]
    }
  }
}
```

### HTTP Transport

```bash
npx copilot-mem --http --port=8787
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_observations` | FTS5 search, returns IDs + titles |
| `get_observation_details` | Batch fetch full observations by ID |
| `get_timeline` | Chronological context window |
| `save_observation` | Save new observation with dedup |
| `get_project_context` | Curated project context |
| `list_projects` | All projects with counts |

## Generate Copilot Instructions

```bash
cd your-project
npx copilot-mem generate-instructions
```

Writes `.github/copilot-instructions.md` with project-specific context from the observation database.

## Architecture

```
~/.claude-mem/claude-mem.db  (shared SQLite, WAL mode)
    |
    +-- claude-mem hooks (existing)
    +-- copilot-mem MCP server (this package)
         |
         +-- VS Code Copilot Chat
         +-- Copilot CLI
```

Both tools read/write the same database. SQLite WAL mode handles concurrency.

## Packages

| Package | Description |
|---------|-------------|
| `@copilot-mem/shared` | DB access, types, utils (internal) |
| `copilot-mem` | MCP server npm package |
| `copilot-mem-vscode` | VS Code extension |

## Development

```bash
npm install
npx turbo run build
npx turbo run test
```

## License

MIT
