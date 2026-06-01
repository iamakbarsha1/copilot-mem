import { homedir } from "node:os";
import { join } from "node:path";

export function getDataDir(): string {
  return process.env.CLAUDE_MEM_DATA_DIR || join(homedir(), ".claude-mem");
}

export function getDbPath(): string {
  return join(getDataDir(), "claude-mem.db");
}
