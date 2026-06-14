import type { SymbolKind } from "./types.js";

export const EXTENSION_MAP: Record<string, string> = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "tsx",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".py": "python",
  ".pyw": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".css": "css",
};

export interface NodeConfig {
  kind: SymbolKind;
  nameField?: string;
  container?: boolean;
}

const JS_NODES: Record<string, NodeConfig> = {
  function_declaration: { kind: "function", nameField: "name" },
  generator_function_declaration: { kind: "function", nameField: "name" },
  class_declaration: { kind: "class", nameField: "name", container: true },
  method_definition: { kind: "method", nameField: "name" },
};

const TS_NODES: Record<string, NodeConfig> = {
  ...JS_NODES,
  interface_declaration: {
    kind: "interface",
    nameField: "name",
    container: true,
  },
  type_alias_declaration: { kind: "type", nameField: "name" },
  enum_declaration: { kind: "enum", nameField: "name" },
};

export const SYMBOL_NODES: Record<string, Record<string, NodeConfig>> = {
  javascript: JS_NODES,
  typescript: TS_NODES,
  tsx: TS_NODES,
  python: {
    function_definition: { kind: "function", nameField: "name" },
    class_definition: { kind: "class", nameField: "name", container: true },
  },
  go: {
    function_declaration: { kind: "function", nameField: "name" },
    method_declaration: { kind: "method", nameField: "name" },
    type_declaration: { kind: "type" },
  },
  rust: {
    function_item: { kind: "function", nameField: "name" },
    struct_item: { kind: "struct", nameField: "name", container: true },
    enum_item: { kind: "enum", nameField: "name" },
    trait_item: { kind: "trait", nameField: "name", container: true },
    impl_item: { kind: "impl", container: true },
  },
  ruby: {
    method: { kind: "function", nameField: "name" },
    class: { kind: "class", nameField: "name", container: true },
    module: { kind: "class", nameField: "name", container: true },
  },
  java: {
    method_declaration: { kind: "method", nameField: "name" },
    class_declaration: { kind: "class", nameField: "name", container: true },
    interface_declaration: {
      kind: "interface",
      nameField: "name",
      container: true,
    },
    enum_declaration: { kind: "enum", nameField: "name" },
  },
  c: {
    function_definition: { kind: "function", nameField: "declarator" },
    struct_specifier: { kind: "struct", nameField: "name" },
  },
  cpp: {
    function_definition: { kind: "function", nameField: "declarator" },
    class_specifier: { kind: "class", nameField: "name", container: true },
    struct_specifier: { kind: "struct", nameField: "name", container: true },
  },
  bash: {
    function_definition: { kind: "function", nameField: "name" },
  },
  css: {
    rule_set: { kind: "function" },
  },
};

export const IMPORT_TYPES: Record<string, string[]> = {
  javascript: ["import_statement"],
  typescript: ["import_statement"],
  tsx: ["import_statement"],
  python: ["import_statement", "import_from_statement"],
  go: ["import_declaration"],
  rust: ["use_declaration"],
  ruby: [],
  java: ["import_declaration"],
  c: ["preproc_include"],
  cpp: ["preproc_include"],
  bash: [],
  css: ["import_statement"],
};

