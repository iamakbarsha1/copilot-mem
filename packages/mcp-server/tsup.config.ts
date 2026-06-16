import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: ["better-sqlite3", "web-tree-sitter", "@repomix/tree-sitter-wasms", "@anthropic-ai/sdk"],
  noExternal: ["@copilot-mem/shared"],
});
