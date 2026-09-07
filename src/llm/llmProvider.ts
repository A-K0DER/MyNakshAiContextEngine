import { LLMProvider } from "../types";
import { MockProvider } from "./mockProvider";
import { AnthropicProvider } from "./realProvider";

export function getLLMProvider(): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();

  if (providerName === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
  }

  return new MockProvider();
}
