import type { CorpusSession } from "./types.js";

// In-memory corpus sessions (lost on restart — user reprimes)
const sessions = new Map<string, CorpusSession>();

export function getSession(name: string): CorpusSession | undefined {
  return sessions.get(name);
}

export function hasSession(name: string): boolean {
  return sessions.has(name);
}

export async function primeSession(
  name: string,
  observations: Array<{ id: number; title: string | null; type: string; narrative: string | null }>,
): Promise<CorpusSession> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Required for corpus priming. Set it in your environment to use prime_corpus and query_corpus.",
    );
  }

  // Dynamic import to avoid hard crash when SDK not available
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  // Build corpus content
  const corpusText = observations
    .map(
      (o) =>
        `[#${o.id}] [${o.type}] ${o.title || "(untitled)"}\n${o.narrative || ""}`,
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are a knowledge agent with deep understanding of a curated corpus of development observations. The corpus "${name}" contains ${observations.length} observations. Answer questions about this corpus accurately and cite observation IDs when referencing specific entries.`;

  const userMessage = `Here is the full corpus content:\n\n${corpusText}\n\nI've loaded the corpus. Ready for questions.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const assistantText =
    response.content[0].type === "text"
      ? response.content[0].text
      : "Corpus loaded and ready for queries.";

  const session: CorpusSession = {
    corpusName: name,
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantText },
    ],
    primedAt: new Date().toISOString(),
    observationCount: observations.length,
  };

  sessions.set(name, session);
  return session;
}

export async function querySession(
  name: string,
  question: string,
): Promise<string> {
  const session = sessions.get(name);
  if (!session) {
    throw new Error(
      `No primed session for corpus "${name}". Call prime_corpus first.`,
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set.");
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  session.messages.push({ role: "user", content: question });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a knowledge agent for corpus "${name}". Answer questions about the loaded observations accurately. Cite observation IDs (#N) when relevant.`,
    messages: session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const answer =
    response.content[0].type === "text"
      ? response.content[0].text
      : "No response generated.";

  session.messages.push({ role: "assistant", content: answer });
  return answer;
}
