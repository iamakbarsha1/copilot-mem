import { describe, it, expect } from "vitest";
import { computeContentHash } from "../utils/content-hash.js";

describe("computeContentHash", () => {
  it("produces a 16-char hex string", () => {
    const hash = computeContentHash("session-1", "title", "narrative");
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic", () => {
    const a = computeContentHash("s1", "title", "narrative");
    const b = computeContentHash("s1", "title", "narrative");
    expect(a).toBe(b);
  });

  it("differs when any input changes", () => {
    const base = computeContentHash("s1", "title", "narrative");
    const diffSession = computeContentHash("s2", "title", "narrative");
    const diffTitle = computeContentHash("s1", "title2", "narrative");
    const diffNarrative = computeContentHash("s1", "title", "narrative2");

    expect(diffSession).not.toBe(base);
    expect(diffTitle).not.toBe(base);
    expect(diffNarrative).not.toBe(base);
  });

  it("uses null byte as separator", () => {
    // "a\0b" should differ from "ab" joined differently
    const hash1 = computeContentHash("a", "b", "c");
    const hash2 = computeContentHash("a\0b", "", "c");
    expect(hash1).not.toBe(hash2);
  });
});
