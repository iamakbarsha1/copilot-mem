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

## Phase 3: Knowledge Agents (future)
- [ ] Add Anthropic SDK dependency
- [ ] Implement corpus build/prime/query system
- [ ] Implement `build_corpus`, `list_corpora`, `prime_corpus`, `query_corpus`
