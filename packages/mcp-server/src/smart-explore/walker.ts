import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { EXTENSION_MAP } from "./languages.js";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".venv",
  "target",
  ".cache",
  ".turbo",
  "coverage",
  ".claudeMem",
  "vendor",
  ".idea",
  ".vscode",
]);

const MAX_FILE_SIZE = 512 * 1024;

export interface WalkOptions {
  filePattern?: string;
  maxFiles?: number;
}

export function walkDirectory(
  rootPath: string,
  options: WalkOptions = {},
): string[] {
  const files: string[] = [];
  const maxFiles = options.maxFiles ?? 5000;

  function walk(dir: string) {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (!EXTENSION_MAP[ext]) continue;
        if (options.filePattern && !fullPath.includes(options.filePattern))
          continue;
        try {
          if (statSync(fullPath).size > MAX_FILE_SIZE) continue;
        } catch {
          continue;
        }
        files.push(fullPath);
      }
    }
  }

  walk(rootPath);
  return files;
}
