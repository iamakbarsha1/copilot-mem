import { execSync } from "node:child_process";
import { basename } from "node:path";

export function getProjectName(cwd?: string): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return basename(gitRoot);
  } catch {
    return basename(cwd || process.cwd());
  }
}
