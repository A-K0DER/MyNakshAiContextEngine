import { LLMProvider, LLMResponse } from "../types";

const CALL_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 300;

// 429 (rate limit) and 5xx are worth retrying; 4xx like bad request or auth
// failures will just fail the same way again.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Only used if LLM_PROVIDER=gemini and GEMINI_API_KEY is set. Uses the
// built-in fetch (Node 18+) directly rather than pulling in the SDK, to keep
// dependencies minimal per project scope.
export class GeminiProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-2.0-flash",
  ) {}

  async generate(prompt: string): Promise<LLMResponse> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        return await withTimeout(this.callOnce(prompt), CALL_TIMEOUT_MS);
      } catch (err) {
        lastError = err;
        // Non-retryable HTTP errors (bad request, auth failure, etc.) are the
        // only ones excluded — timeouts, network failures, and 429/5xx all retry.
        const retryable = !(err instanceof NonRetryableGeminiError);
        if (!retryable || attempt > MAX_RETRIES) {
          throw err;
        }
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }

    throw lastError;
  }

  private async callOnce(prompt: string): Promise<LLMResponse> {
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
      const message = `Gemini API error ${response.status}: ${body}`;
      if (!isRetryableStatus(response.status)) {
        throw new NonRetryableGeminiError(message);
      }
      throw new Error(message);
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

class NonRetryableGeminiError extends Error {}
