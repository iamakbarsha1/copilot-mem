import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { CorpusManifest } from "./types.js";

const CORPORA_DIR = join(homedir(), ".claude-mem", "corpora");

function ensureDir() {
  if (!existsSync(CORPORA_DIR)) {
    mkdirSync(CORPORA_DIR, { recursive: true });
  }
}

function manifestPath(name: string): string {
  return join(CORPORA_DIR, `${name}.json`);
}

export function saveManifest(manifest: CorpusManifest): void {
  ensureDir();
  writeFileSync(manifestPath(manifest.name), JSON.stringify(manifest, null, 2));
}

export function loadManifest(name: string): CorpusManifest | null {
  const path = manifestPath(name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function listManifests(): CorpusManifest[] {
  ensureDir();
  const files = readdirSync(CORPORA_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const content = readFileSync(join(CORPORA_DIR, f), "utf-8");
    return JSON.parse(content) as CorpusManifest;
  });
}
