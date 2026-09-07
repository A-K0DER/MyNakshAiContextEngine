import { Intent, PersonalizationDecision, UserProfile } from "../types";

export interface BuiltPrompt {
  prompt: string;
  wordCount: number;
  estimatedTokens: number;
}

const INTENT_INTROS: Record<Intent, string> = {
  career: "The user is asking about their career and professional path.",
  relationship: "The user is asking about their relationships or partnerships.",
  health: "The user is asking about their health and wellbeing.",
  finance: "The user is asking about their finances and money matters.",
  general: "The user is asking a general astrological question.",
};

// Injects only the selectedContext values (never the full fetched payloads).
export function buildPrompt(
  question: string,
  decision: PersonalizationDecision,
  user: UserProfile | null,
): BuiltPrompt {
  const userName = user?.name ?? "the user";
  const contextLines = Object.entries(decision.selectedContext)
    .map(([field, value]) => `- ${field}: ${value}`)
    .join("\n");

  const prompt = [
    `You are an astrology assistant speaking to ${userName}.`,
    INTENT_INTROS[decision.intent],
    "",
    "Relevant astrological context (use only this, do not invent facts):",
    contextLines || "(no context available)",
    "",
    `Respond in ${decision.language}, in a ${decision.tone.toLowerCase()} tone.`,
    `Keep the answer under ${decision.maxWords} words.`,
    "",
    `Question: ${question}`,
  ].join("\n");

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);

  return { prompt, wordCount, estimatedTokens };
}
