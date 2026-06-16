# Copilot-Mem: Claude-Mem Feature Parity

## Phase 1: Critical MCP Tools (current session) ✅

- [x] Add `__IMPORTANT` workflow documentation tool
- [x] Add session summaries DB queries to shared package
- [x] Add `get_session_summaries` MCP tool
- [x] Add `observation_context` MCP tool (auto-inject relevant context)
- [x] Enhance `search_observations` with date filters, offset, ordering
- [x] Build and test — 17 tests pass, 9 tools registered

## Phase 2: Smart Code Exploration ✅
- [x] Add tree-sitter via web-tree-sitter (WASM) + @repomix/tree-sitter-wasms
- [x] Implement `smart_search` tool — AST-aware codebase search with folded views
- [x] Implement `smart_outline` tool — structural file skeleton (80%+ token savings)
- [x] Implement `smart_unfold` tool — expand single symbol to full source
- [x] 12 languages supported: JS, TS, TSX, Python, Go, Rust, Ruby, Java, C, C++, CSS, Bash
- [x] Build clean, 17 shared tests pass, 12 tools registered, all 3 smart tools verified live

## Phase 3: Full Claude-Mem Feature Parity ✅

### Phase 3A: Session Context + Observation Write + Aliases ✅
- [x] Dynamic `__IMPORTANT` — generates rich session context (observation index, stats, economics)
- [x] Context formatter module (`packages/mcp-server/src/context/`) shared between __IMPORTANT and generate-instructions
- [x] Enhanced `generate-instructions` CLI using shared context formatter
- [x] `observation_add` tool — write observations directly to local SQLite
- [x] `observation_record_event` tool — record dev events as change observations
- [x] `observation_generation_status` tool — stub returning not_supported
- [x] `observation_search` tool — FTS5 search against local DB
- [x] `memory_add` / `memory_search` / `memory_context` — legacy aliases for claude-mem compatibility

### Phase 3B: Corpus/Knowledge Agent System ✅
- [x] Added `@anthropic-ai/sdk` dependency (external in tsup)
- [x] Corpus module (`packages/mcp-server/src/corpus/`) — types, storage, filter, agent
- [x] `build_corpus` — create named filtered views saved as JSON manifests
- [x] `list_corpora` — list all corpus manifests
- [x] `prime_corpus` — load corpus into AI session (requires ANTHROPIC_API_KEY)
- [x] `query_corpus` — ask questions about primed corpus
- [x] `rebuild_corpus` — re-execute filter to update counts
- [x] `reprime_corpus` — rebuild + reprime in one step

### Phase 3C: Context Generation Engine ✅
- [x] `generateSessionContext()` — groups obs by date, formats ID/TIME/TYPE/TITLE, context economics
- [x] Shared between `__IMPORTANT` tool and `generate-instructions` CLI

### Verification ✅
- [x] Build clean — both packages compile
- [x] 25 tools registered via JSON-RPC tools/list
- [x] `__IMPORTANT` returns rich dynamic session context
- [x] `list_corpora` returns empty corpus list
- [x] `observation_generation_status` returns not_supported stub
- [x] Server version bumped to 0.2.0
