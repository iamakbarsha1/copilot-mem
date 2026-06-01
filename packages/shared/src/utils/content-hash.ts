import { createHash } from "node:crypto";

/**
 * Exact replica of claude-mem's content hash algorithm.
 * SHA-256 of [sessionId, title, narrative] joined by null byte, truncated to 16 hex chars.
 */
export function computeContentHash(
  sessionId: string,
  title: string,
  narrative: string,
): string {
  const input = [sessionId, title, narrative].join("\0");
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
