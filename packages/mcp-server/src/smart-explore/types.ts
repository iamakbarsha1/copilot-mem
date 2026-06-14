export type SymbolKind =
  | "function"
  | "class"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "struct"
  | "trait"
  | "impl"
  | "mixin";

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  signature: string;
  jsdoc?: string;
  lineStart: number; // 0-indexed
  lineEnd: number; // 0-indexed
  exported?: boolean;
  children?: CodeSymbol[];
}

export interface ParsedFile {
  path: string;
  language: string;
  lineCount: number;
  imports: string[];
  symbols: CodeSymbol[];
  tokenEstimate: number;
}
