# MyNaksh Personalized AI Context Engine

The layer that sits between four upstream astrology backend services and an LLM. It gathers
context concurrently, detects intent, selects only the relevant data via a config-driven
personalization engine, builds a minimal prompt, and returns a grounded, tone/language-adjusted
response.

## Setup

```bash
npm install
cp .env.example .env
npm run dev      # tsx watch server.ts
```

The server listens on `http://localhost:3000` (configurable via `PORT`). No API keys are
required — the default `LLM_PROVIDER=mock` uses a templated mock LLM.

To type-check without emitting: `npm run typecheck`. To build/run compiled JS: `npm run build && npm start`.

## Endpoints

### `POST /personalize`

```bash
curl -s -X POST http://localhost:3000/personalize \
  -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"Should I consider changing my job in the next few months?"}'
```

```json
{
  "answer": "...",
  "confidence": "HIGH",
  "sourcesUsed": ["Career Horoscope", "10th House", "Current Dasha", "Today's Panchang"]
}
```

### `POST /debug/personalization`

Same request shape. Skips the LLM entirely and returns the engine's internal decision.

```bash
curl -s -X POST http://localhost:3000/debug/personalization \
  -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"Should I consider changing my job in the next few months?"}'
```

```json
{
  "intent": "career",
  "selectedContext": ["Career Horoscope", "10th House", "Current Dasha", "Today's Panchang"],
  "excludedContext": ["Relationship Horoscope", "Health Horoscope", "Finance Horoscope", "6th House", "7th House"],
  "language": "English",
  "tone": "Friendly"
}
```

### `GET /health`

Basic liveness check.

## Using a real LLM

Set in `.env`:

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

If the key is absent, the mock provider is used regardless of `LLM_PROVIDER`.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the request flow diagram and module responsibilities.

## Testing every scenario

See [API_TESTING.md](./API_TESTING.md) for a full API reference plus `curl` commands covering
each intent, personalization behavior, partial-failure/caching/error scenarios, and log events.

A ready-to-import Postman collection covering the same scenarios is at
[MyNaksh_AI_Context_Engine.postman_collection.json](./MyNaksh_AI_Context_Engine.postman_collection.json)
(Postman → Import → File). It defines a `baseUrl` collection variable defaulting to
`http://localhost:3000`.

Key design point: **`src/config/personalizationRules.ts` is the single source of truth** for
which context fields matter per intent, default tone/language/length, and what's excluded. The
engine (`src/core/personalizationEngine.ts`) reads this config and calls small per-field
resolvers (`src/core/contextResolvers.ts`) — it never branches on intent with `if`/`switch`.
Adding a sixth intent means adding one entry to the config object.

## Assumptions

- "Intent" is limited to the five specified categories (career, relationship, health, finance,
  general); no sub-intents or multi-intent blending.
- Mock upstream services are self-contained pseudo-random generators seeded by `userId` (and by
  date for Panchang), so the same user gets stable underlying data across calls (only latency and
  transient failure vary) — this makes debug output reproducible enough to reason about.
- "Relevant" context per intent is a fixed, hand-authored mapping (see `personalizationRules.ts`)
  rather than something inferred at runtime; this matches the assignment's request for a
  config-driven, non-branching engine.
- The user's own `language`/`tonePreference` always overrides the intent's default, per the spec.
- A request is only a hard failure (500) if literally all four upstream calls fail after retries,
  or the LLM call itself throws. Any partial success proceeds with lowered confidence.
- Cache TTLs are illustrative defaults (5 min for user/kundli, 1 min for horoscope, 1 hour for
  Panchang) — not tuned against any real product SLA.
- `sourcesUsed` in `/personalize` is the list of context field names that actually resolved and
  were injected into the prompt (i.e. `selectedContext` keys), not a citation-checked answer.

## Trade-offs

**Intentionally simplified:**
- In-memory cache and no persistence — a process restart loses all cached state; there's no
  distributed cache, so this would not be safe to run as multiple replicas without a shared cache
  (e.g. Redis) behind it.
- Retry backoff is plain exponential (`150ms * 2^attempt`) with no jitter, so under real load
  concurrent retries could synchronize ("thundering herd"). Production would add randomized
  jitter. `GeminiProvider` uses the same pattern (10s timeout, 2 retries, 300ms base backoff) and
  retries on timeouts, network errors, 429, and 5xx — not on 4xx (bad request/auth), which would
  just fail identically again.
- Prompt sizing is word-count based with a rough `words * 1.3` token estimate, not a real
  tokenizer. Good enough for logging/observability, not for hard token-budget enforcement against
  a real model's context window.
- The mock LLM provider does light regex parsing of the prompt's own structured sections
  (context bullet lines, tone, question) rather than being handed structured data directly — kept
  this way so `LLMProvider.generate(prompt: string)` stays a clean single-string interface matching
  what a real provider expects.
- No conversation history / multi-turn context — every request is independent.
- Confidence scoring is a simple ratio-based heuristic (primary/secondary field resolution), not
  calibrated against real outcome data.

**What I'd improve with another day:**
- Add unit tests per module (intent detector, confidence scorer, personalization engine) — the
  architecture was deliberately built so each module is independently testable, but I didn't
  write the test suite itself given the scope constraints.
- Add jitter to retry backoff and make timeout/retry/backoff values configurable per service
  (Panchang, being shared across all users, might warrant a longer timeout and more aggressive
  caching than per-user services).
- Real token counting via a tokenizer library if prompt-size accuracy mattered for billing/limits.
- A circuit breaker per upstream service so a persistently failing service stops being retried
  for a cooldown window instead of retrying on every request.

**Production concerns intentionally left out (per assignment scope):**
- Authentication/authorization on the endpoints.
- A real database for user/kundli/horoscope data (currently pure in-process mocks).
- A distributed cache (Redis/Memcached) for multi-instance deployments.
- Rate limiting, request quotas, abuse protection.
- Real retry jitter and circuit breaking.
- Token-accurate prompt sizing against the actual target model's tokenizer.
- Observability beyond structured console logs (no metrics export, tracing, or alerting).
