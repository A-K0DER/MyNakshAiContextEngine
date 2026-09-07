import { LLMProvider } from "../types";
import { MockProvider } from "./mockProvider";
import { AnthropicProvider } from "./realProvider";
import { GeminiProvider } from "./geminiProvider";

export function getLLMProvider(): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();

  if (providerName === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
  }

  if (providerName === "gemini" && process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL);
  }

  return new MockProvider();
}
