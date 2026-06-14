# Copilot-Mem: Claude-Mem Feature Parity

## Phase 1: Critical MCP Tools (current session) ✅

- [x] Add `__IMPORTANT` workflow documentation tool
- [x] Add session summaries DB queries to shared package
- [x] Add `get_session_summaries` MCP tool
- [x] Add `observation_context` MCP tool (auto-inject relevant context)
- [x] Enhance `search_observations` with date filters, offset, ordering
- [x] Build and test — 17 tests pass, 9 tools registered

## Phase 2: Smart Code Exploration (next session)
- [ ] Add tree-sitter dependency
- [ ] Implement `smart_search` tool
- [ ] Implement `smart_outline` tool
- [ ] Implement `smart_unfold` tool

## Phase 3: Knowledge Agents (future)
- [ ] Add Anthropic SDK dependency
- [ ] Implement corpus build/prime/query system
- [ ] Implement `build_corpus`, `list_corpora`, `prime_corpus`, `query_corpus`
