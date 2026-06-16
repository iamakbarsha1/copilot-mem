import type { CorpusSession } from "./types.js";

// In-memory corpus sessions (lost on restart — user reprimes)
const sessions = new Map<string, CorpusSession>();

export function getSession(name: string): CorpusSession | undefined {
  return sessions.get(name);
}

export function hasSession(name: string): boolean {
  return sessions.has(name);
}

type Provider = "anthropic" | "openai";

function detectProvider(): { provider: Provider; apiKey: string } {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };

  throw new Error(
    "No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY (+ OPENAI_BASE_URL for NVIDIA/OpenRouter).",
  );
}

async function chatAnthropic(
  apiKey: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "No response generated.";
}

async function chatOpenAI(
  apiKey: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    max_tokens: maxTokens,
    messages: [
      { role: "system" as const, content: system },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  return response.choices[0]?.message?.content || "No response generated.";
}

async function chat(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  const { provider, apiKey } = detectProvider();
  if (provider === "anthropic") {
    return chatAnthropic(apiKey, system, messages, maxTokens);
  }
  return chatOpenAI(apiKey, system, messages, maxTokens);
}

function buildCorpusText(
  observations: Array<{ id: number; title: string | null; type: string; narrative: string | null }>,
): string {
  return observations
    .map(
      (o) =>
        `[#${o.id}] [${o.type}] ${o.title || "(untitled)"}\n${o.narrative || ""}`,
    )
    .join("\n\n---\n\n");
}

export async function primeSession(
  name: string,
  observations: Array<{ id: number; title: string | null; type: string; narrative: string | null }>,
): Promise<CorpusSession> {
  const systemPrompt = `You are a knowledge agent with deep understanding of a curated corpus of development observations. The corpus "${name}" contains ${observations.length} observations. Answer questions about this corpus accurately and cite observation IDs when referencing specific entries.`;

  const userMessage = `Here is the full corpus content:\n\n${buildCorpusText(observations)}\n\nI've loaded the corpus. Ready for questions.`;

  const assistantText = await chat(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    1024,
  );

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

  session.messages.push({ role: "user", content: question });

  const answer = await chat(
    `You are a knowledge agent for corpus "${name}". Answer questions about the loaded observations accurately. Cite observation IDs (#N) when relevant.`,
    session.messages,
    2048,
  );

  session.messages.push({ role: "assistant", content: answer });
  return answer;
}
