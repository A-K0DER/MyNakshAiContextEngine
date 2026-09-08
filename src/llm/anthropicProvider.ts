import { LLMProvider, LLMResponse } from "../types";

// Only used if LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY is set. Uses the
// built-in fetch (Node 18+) directly rather than pulling in the SDK, to keep
// dependencies minimal per project scope.
export class AnthropicProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async generate(prompt: string): Promise<LLMResponse> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as {
      content: { type: string; text?: string }[];
    };

    const answer = json.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { answer };
  }
}
