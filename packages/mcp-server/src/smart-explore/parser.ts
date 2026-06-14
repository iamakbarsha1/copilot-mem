import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import type { CodeSymbol, ParsedFile } from "./types.js";
import {
  EXTENSION_MAP,
  SYMBOL_NODES,
  IMPORT_TYPES,
  type NodeConfig,
} from "./languages.js";

const require = createRequire(import.meta.url);

let ParserClass: any = null;
let LanguageClass: any = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<boolean> {
  if (initialized) return ParserClass !== null;
  if (initPromise) {
    await initPromise;
    return ParserClass !== null;
  }

  initPromise = (async () => {
    try {
      const mod = require("web-tree-sitter");
      const P = mod.Parser ?? mod.default?.Parser;
      const L = mod.Language ?? mod.default?.Language;
      await P.init();
      ParserClass = P;
      LanguageClass = L;
    } catch {
      ParserClass = null;
      LanguageClass = null;
    }
    initialized = true;
  })();

  await initPromise;
  return ParserClass !== null;
}

function getWasmPath(lang: string): string | null {
  const wasmName = `tree-sitter-${lang}.wasm`;
  try {
    const pkgJson = require.resolve(
      "@repomix/tree-sitter-wasms/package.json",
    );
    const wasmPath = join(dirname(pkgJson), "out", wasmName);
    return existsSync(wasmPath) ? wasmPath : null;
  } catch {
    return null;
  }
}

const languageCache = new Map<string, any>();

async function loadLanguage(lang: string): Promise<any | null> {
  if (languageCache.has(lang)) return languageCache.get(lang) ?? null;
  if (!LanguageClass) {
    languageCache.set(lang, null);
    return null;
  }

  const wasmPath = getWasmPath(lang);
  if (!wasmPath) {
    languageCache.set(lang, null);
    return null;
  }

  try {
    const language = await LanguageClass.load(wasmPath);
    languageCache.set(lang, language);
    return language;
  } catch {
    languageCache.set(lang, null);
    return null;
  }
}

export function getLanguage(filePath: string): string | null {
  return EXTENSION_MAP[extname(filePath).toLowerCase()] ?? null;
}

export function isAvailable(): boolean {
  return initialized ? ParserClass !== null : true;
}

export async function parseFile(filePath: string): Promise<ParsedFile | null> {
  const lang = getLanguage(filePath);
  if (!lang) return null;

  if (!(await ensureInit())) return null;

  const language = await loadLanguage(lang);
  if (!language) return null;

  let source: string;
  try {
    source = readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const parser = new ParserClass();
  parser.setLanguage(language);
  const tree = parser.parse(source);

  const lines = source.split("\n");
  const config = SYMBOL_NODES[lang] ?? {};
  const importTypeSet = new Set(IMPORT_TYPES[lang] ?? []);
  const imports: string[] = [];

  const symbols = walkNode(
    tree.rootNode,
    config,
    importTypeSet,
    imports,
    lines,
    lang,
  );
  const tokenEstimate = Math.ceil(source.length / 4);

  parser.delete();
  tree.delete();

  return {
    path: filePath,
    language: lang,
    lineCount: lines.length,
    imports,
    symbols,
    tokenEstimate,
  };
}

function walkNode(
  node: any,
  config: Record<string, NodeConfig>,
  importTypes: Set<string>,
  imports: string[],
  lines: string[],
  lang: string,
): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (const child of node.namedChildren) {
    if (importTypes.has(child.type)) {
      imports.push(child.text.trim().split("\n")[0]);
      continue;
    }

    // Unwrap export_statement (JS/TS)
    if (child.type === "export_statement") {
      for (const inner of child.namedChildren) {
        const syms = processChild(
          inner,
          config,
          importTypes,
          imports,
          lines,
          lang,
        );
        syms.forEach((s) => {
          s.exported = true;
        });
        symbols.push(...syms);
      }
      continue;
    }

    // Handle const/let arrow functions (JS/TS)
    if (
      child.type === "lexical_declaration" ||
      child.type === "variable_declaration"
    ) {
      const arrowSyms = extractArrowFunctions(child, lines);
      symbols.push(...arrowSyms);
      continue;
    }

    symbols.push(
      ...processChild(child, config, importTypes, imports, lines, lang),
    );
  }

  return symbols;
}

function processChild(
  child: any,
  config: Record<string, NodeConfig>,
  importTypes: Set<string>,
  imports: string[],
  lines: string[],
  lang: string,
): CodeSymbol[] {
  if (
    child.type === "lexical_declaration" ||
    child.type === "variable_declaration"
  ) {
    return extractArrowFunctions(child, lines);
  }

  const nc = config[child.type];
  if (!nc) return [];

  const name = extractName(child, nc, lang);
  if (!name) return [];

  const sym: CodeSymbol = {
    name,
    kind: nc.kind,
    signature: getSignature(child, lines),
    lineStart: child.startPosition.row,
    lineEnd: child.endPosition.row,
  };

  const jsdoc = getJSDoc(child, lines);
  if (jsdoc) sym.jsdoc = jsdoc;

  if (nc.container) {
    const body = child.childForFieldName("body") ?? findBodyChild(child);
    if (body) {
      sym.children = walkNode(body, config, importTypes, [], lines, lang);
    }
  }

  return [sym];
}

function extractArrowFunctions(decl: any, lines: string[]): CodeSymbol[] {
  const syms: CodeSymbol[] = [];
  for (const declarator of decl.namedChildren) {
    if (declarator.type !== "variable_declarator") continue;
    const value = declarator.childForFieldName("value");
    if (
      !value ||
      (value.type !== "arrow_function" && value.type !== "function_expression")
    )
      continue;
    const nameNode = declarator.childForFieldName("name");
    if (!nameNode) continue;
    const sym: CodeSymbol = {
      name: nameNode.text,
      kind: "function",
      signature: getSignature(decl, lines),
      lineStart: decl.startPosition.row,
      lineEnd: decl.endPosition.row,
    };
    const jsdoc = getJSDoc(decl, lines);
    if (jsdoc) sym.jsdoc = jsdoc;
    syms.push(sym);
  }
  return syms;
}

function extractName(node: any, config: NodeConfig, lang: string): string {
  if (config.nameField) {
    const nameNode = node.childForFieldName(config.nameField);
    if (nameNode) return getIdentifierText(nameNode);
  }

  if (node.type === "impl_item") {
    const typeNode = node.childForFieldName("type");
    return typeNode ? `impl ${typeNode.text}` : "impl";
  }

  if (node.type === "type_declaration" && lang === "go") {
    for (const child of node.namedChildren) {
      if (child.type === "type_spec") {
        const n = child.childForFieldName("name");
        return n ? n.text : "";
      }
    }
  }

  if (node.type === "rule_set") {
    const sel = node.namedChildren[0];
    return sel ? sel.text.trim().split("\n")[0] : "";
  }

  return "";
}

function getIdentifierText(node: any): string {
  const simpleTypes = [
    "identifier",
    "type_identifier",
    "property_identifier",
    "field_identifier",
    "constant",
    "word",
    "name",
    "simple_identifier",
  ];
  if (simpleTypes.includes(node.type)) return node.text;

  for (const child of node.namedChildren ?? []) {
    if (child.type === "identifier") return child.text;
    const found = getIdentifierText(child);
    if (found) return found;
  }
  return node.text.split("(")[0].trim();
}

function findBodyChild(node: any): any | null {
  const bodyTypes = [
    "class_body",
    "block",
    "body",
    "declaration_list",
    "field_declaration_list",
    "enum_body",
    "interface_body",
  ];
  for (const child of node.namedChildren) {
    if (bodyTypes.includes(child.type)) return child;
  }
  return null;
}

function getSignature(node: any, lines: string[]): string {
  const line = lines[node.startPosition.row] ?? "";
  return line.replace(/\s*[{:]\s*$/, "").trim();
}

function getJSDoc(node: any, lines: string[]): string | undefined {
  const row = node.startPosition.row;
  if (row === 0) return undefined;

  let i = row - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i < 0) return undefined;

  const line = lines[i].trim();
  if (
    !line.startsWith("//") &&
    !line.startsWith("*") &&
    !line.startsWith("/*") &&
    !line.startsWith("#") &&
    !line.startsWith('"""') &&
    !line.startsWith("'''")
  ) {
    return undefined;
  }

  return (
    line
      .replace(/^[\s/*#'"]+/, "")
      .replace(/\*\/\s*$/, "")
      .trim() || undefined
  );
}

export function findSymbol(
  symbols: CodeSymbol[],
  name: string,
): CodeSymbol | null {
  for (const sym of symbols) {
    if (sym.name === name) return sym;
    if (sym.children) {
      const found = findSymbol(sym.children, name);
      if (found) return found;
    }
  }
  return null;
}

export function getSourceForSymbol(
  filePath: string,
  symbol: CodeSymbol,
): string | null {
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    let start = symbol.lineStart;
    while (start > 0) {
      const prev = lines[start - 1].trim();
      if (
        prev.startsWith("//") ||
        prev.startsWith("*") ||
        prev.startsWith("/*") ||
        prev.startsWith("#") ||
        prev.startsWith("@") ||
        prev.startsWith('"""')
      ) {
        start--;
      } else break;
    }
    return lines.slice(start, symbol.lineEnd + 1).join("\n");
  } catch {
    return null;
  }
}
