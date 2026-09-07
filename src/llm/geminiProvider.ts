import { LLMProvider, LLMResponse } from "../types";

// Only used if LLM_PROVIDER=gemini and GEMINI_API_KEY is set. Uses the
// built-in fetch (Node 18+) directly rather than pulling in the SDK, to keep
// dependencies minimal per project scope.
export class GeminiProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-2.0-flash",
  ) {}

  async generate(prompt: string): Promise<LLMResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const answer = (json.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();

    return { answer };
  }
}
