import { LLMProvider, LLMResponse } from "../types";

// Default provider — zero API keys required. Builds a templated response by
// lightly parsing the structured sections the prompt builder always emits
// (context lines, tone, question), so it reads as grounded without an LLM.
export class MockProvider implements LLMProvider {
  async generate(prompt: string): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));

    const contextLines = prompt
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));

    const toneMatch = prompt.match(/Respond in .*?, in a (\w+) tone\./);
    const tone = toneMatch ? toneMatch[1] : "friendly";

    const questionMatch = prompt.match(/Question: (.*)/s);
    const question = questionMatch ? questionMatch[1].trim() : "your question";

    const contextSummary =
      contextLines.length > 0
        ? contextLines.map((line) => line.split(":")[0]).join(", ")
        : "your general chart";

    const opener = TONE_OPENERS[tone] ?? TONE_OPENERS.friendly;

    const insight =
      contextLines.length > 0
        ? contextLines.map((line) => `Looking at your ${line.toLowerCase()}.`).join(" ")
        : "Your chart doesn't show any strongly dominant signals for this right now.";

    const answer = `${opener} Based on ${contextSummary}, here's what stands out for "${question}": ${insight} Take this as guidance rather than certainty, and revisit it as circumstances evolve.`;

    return { answer };
  }
}

const TONE_OPENERS: Record<string, string> = {
  motivational: "You're in a strong position to act on this.",
  friendly: "Happy to walk through this with you.",
  formal: "Here is a considered assessment of your query.",
  direct: "Here's the straightforward read.",
};
