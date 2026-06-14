import type { CodeSymbol, ParsedFile } from "./types.js";

const KIND_ICONS: Record<string, string> = {
  function: "\u0192",
  class: "\u25C6",
  method: "\u25B8",
  interface: "\u25C7",
  type: "\u25B9",
  enum: "\u25C8",
  struct: "\u25C6",
  trait: "\u25C7",
  impl: "\u25AA",
  mixin: "\u25B9",
};

export function formatOutline(parsed: ParsedFile): string {
  let out = `## ${parsed.path}\n`;
  out += `${parsed.language} | ${parsed.lineCount} lines\n`;

  if (parsed.imports.length) {
    out += `\nImports (${parsed.imports.length}):\n`;
    for (const imp of parsed.imports) {
      out += `  ${imp}\n`;
    }
  }

  if (parsed.symbols.length) {
    out += `\nSymbols:\n`;
    out += formatSymbolTree(parsed.symbols, 1);
  }

  return out;
}

function formatSymbolTree(symbols: CodeSymbol[], depth: number): string {
  let out = "";
  const indent = "  ".repeat(depth);

  for (const sym of symbols) {
    const icon = KIND_ICONS[sym.kind] || "\u2022";
    const exp = sym.exported ? " [exported]" : "";
    const lines = `L${sym.lineStart + 1}-${sym.lineEnd + 1}`;
    out += `${indent}${icon} ${sym.name} (${sym.kind}) ${lines}${exp}\n`;
    out += `${indent}  ${sym.signature}\n`;
    if (sym.jsdoc) {
      out += `${indent}  // ${sym.jsdoc}\n`;
    }
    if (sym.children?.length) {
      out += formatSymbolTree(sym.children, depth + 1);
    }
  }

  return out;
}

export function formatSearchResults(
  files: ParsedFile[],
  query: string,
  maxResults: number,
): string {
  let out = `Search: "${query}" \u2014 ${files.length} file(s) matched\n\n`;

  for (const file of files.slice(0, maxResults)) {
    out += formatOutline(file);
    out += "\n";
  }

  if (files.length > maxResults) {
    out += `... and ${files.length - maxResults} more files\n`;
  }

  const fullTokens = files
    .slice(0, maxResults)
    .reduce((sum, f) => sum + f.tokenEstimate, 0);
  const outlineTokens = Math.ceil(out.length / 4);
  out += `\n~${outlineTokens} outline tokens vs ~${fullTokens} full-file tokens\n`;

  return out;
}

export function formatUnfold(
  filePath: string,
  symbolName: string,
  source: string,
  symbol: CodeSymbol,
): string {
  return (
    `## ${filePath}:${symbol.lineStart + 1}\n` +
    `${symbol.kind} ${symbolName}\n\n` +
    "```\n" +
    source +
    "\n```\n"
  );
}
