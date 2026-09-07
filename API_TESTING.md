# API Reference & Test Scenarios

This document lists every HTTP endpoint the service exposes and gives copy-pasteable `curl`
commands for each scenario called out in the assignment (intent variety, personalization,
partial upstream failure, caching, and error handling). For architecture, see
[ARCHITECTURE.md](./ARCHITECTURE.md); for setup, see [README.md](./README.md).

All commands assume the server is running locally on the default port:

```bash
npm run dev
# server listens on http://localhost:3000
```

---

## Endpoints

### `GET /health`

Liveness check. No body.

```bash
curl -s http://localhost:3000/health
```

```json
{ "status": "ok" }
```

---

### `POST /personalize`

Runs the full pipeline: fetch context → detect intent → personalize → build prompt → call the
LLM → return a grounded answer.

**Request body**

| field      | type   | required | notes                        |
| ---------- | ------ | -------- | ----------------------------- |
| `userId`   | string | yes      | non-empty; any string works, mock services generate deterministic data from it |
| `question` | string | yes      | non-empty; free text          |

**Response body**

| field         | type                          | notes                                    |
| ------------- | ----------------------------- | ----------------------------------------- |
| `answer`      | string                        | LLM-generated, grounded in selected context |
| `confidence`  | `"HIGH" \| "MEDIUM" \| "LOW"` | derived from how much context resolved   |
| `sourcesUsed` | string[]                      | context field names actually injected into the prompt |

```bash
curl -s -X POST http://localhost:3000/personalize \
  -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"Should I consider changing my job in the next few months?"}'
```

---

### `POST /debug/personalization`

Same request body as `/personalize`. Skips the LLM entirely — returns only the
Personalization Engine's internal decision, for inspecting *why* it chose what it chose.

**Response body**

| field             | type                          |
| ------------------ | ----------------------------- |
| `intent`            | `Intent`                      |
| `selectedContext`   | string[] (field names injected into the prompt) |
| `excludedContext`   | string[] (field names deliberately or by-failure excluded) |
| `language`          | `Language`                    |
| `tone`              | `TonePreference`              |

```bash
curl -s -X POST http://localhost:3000/debug/personalization \
  -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"Should I consider changing my job in the next few months?"}'
```

---

## Test Scenarios

### 1. Intent detection across all categories

Mock data is deterministic per `userId` (seeded hash), so the same `userId` always returns the
same underlying chart/horoscope data — only latency and transient failures vary between calls.
Use `/debug/personalization` to see the routing decision without spending an LLM call.

```bash
# Career
curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"Should I consider changing my job this year?"}'
# → intent: "career", selectedContext includes Career Horoscope, 10th House, Current Dasha

# Relationship
curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_102","question":"How does this month look for my relationship?"}'
# → intent: "relationship", selectedContext includes Relationship Horoscope, 7th House, Current Dasha

# Health
curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_103","question":"What should I focus on for my health?"}'
# → intent: "health", selectedContext includes Health Horoscope, 6th House, Current Dasha

# Finance
curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_105","question":"What should I prioritize this week for my investments and savings?"}'
# → intent: "finance", selectedContext includes Finance Horoscope, Current Dasha, 10th House

# General (no strong keyword match)
curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_104","question":"Can you summarize todays guidance?"}'
# → intent: "general", selectedContext includes Lagna, Moon Sign, Current Dasha
```

**What to check:** `excludedContext` never overlaps with `selectedContext`, and each intent's
exclusions match the mapping in [src/config/personalizationRules.ts](./src/config/personalizationRules.ts)
(e.g. career excludes Relationship Horoscope; relationship excludes Career Horoscope).

Intent keyword lists live in [src/core/intentDetector.ts](./src/core/intentDetector.ts) — any
question containing a keyword like "job", "relationship", "health", "investment" routes
accordingly; anything with no keyword hits falls back to `general`.

### 2. Personalized language & tone

`language` and `tonePreference` come from the mock User Service and are seeded by `userId`, so
different `userId`s surface different combinations without any special setup. Run the same
question against a handful of `userId`s and diff the `language`/`tone` fields:

```bash
for uid in user_101 user_102 user_103 user_104 user_105; do
  echo "== $uid =="
  curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
    -d "{\"userId\":\"$uid\",\"question\":\"general guidance for today\"}" | grep -o '"language":"[^"]*"\|"tone":"[^"]*"'
done
```

**What to check:** `language` is one of `English`/`Hindi`/`Hinglish` and `tone` is one of
`Formal`/`Friendly`/`Motivational`/`Direct` — the user's own preference always overrides the
intent's default tone (see `buildPersonalizationDecision` in
[src/core/personalizationEngine.ts](./src/core/personalizationEngine.ts)). On `/personalize`,
also confirm the `answer` text is actually written in the reported language.

### 3. Response length personalization

`maxWords` differs per intent (`career`/`relationship`/`finance` = 180, `health`/`general` =
150) and is passed into the prompt as an instruction to the LLM
(`Keep the answer under {maxWords} words.`). Check `prompt_built` log lines (see §6) for
`wordCount`/`estimatedTokens`, or just eyeball answer length across intents.

### 4. Partial upstream failure → degraded confidence

Every mock upstream call (`src/services/simulate.ts`) has a ~10% independent random failure
rate per attempt, retried up to twice with backoff
(`src/core/fetchOrchestrator.ts`). Because failures are random, the easiest way to *see* one is
to fire enough requests that at least one service degrades:

```bash
for i in $(seq 1 15); do
  curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
    -d '{"userId":"user_101","question":"career guidance"}' \
    -w '\n' 
done
```

Watch the server's stdout for `upstream_fetch` log lines with `"status":"failed"` on one of the
four services — the corresponding `/personalize` response for that request will show
`confidence: "MEDIUM"` or `"LOW"` and the affected context fields will appear in
`excludedContext` instead of `selectedContext`, with the prompt built only from what actually
resolved.

**To force this deterministically** for a demo, temporarily raise the failure rate in
[src/services/simulate.ts](./src/services/simulate.ts) (`maybeFail(name, 0.9)` in one service),
restart the dev server, hit `/personalize`, then revert. This is intentionally not exposed as a
runtime flag (see README trade-offs) — it's a mock-only knob for local testing.

### 5. Full upstream outage → 500

If literally all four services fail after retries, `/personalize` and `/debug/personalization`
both return a `500` with `{"error":"Unable to fetch any context for this user."}` instead of a
degraded response — see `NoContextAvailableError` in
[src/core/requestPipeline.ts](./src/core/requestPipeline.ts). At the default 10% failure rate
this is very unlikely to occur by chance in a single call
(≈0.1⁴ per request); to see it directly, bump all four `maybeFail` calls to a high rate
temporarily as in scenario 4, then restart and call either endpoint.

### 6. Caching (in-memory, per-service TTL)

Call the same `userId` twice in a row and compare timing — the second call should be
noticeably faster and the `upstream_fetch` log line should show `cacheHit: true` for
`user`/`kundli`/`horoscope`/`panchang` (TTLs: 5 min / 5 min / 1 min / 1 hour by default, see
[src/core/cache.ts](./src/core/cache.ts)).

```bash
time curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"career guidance"}' > /dev/null
time curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"user_101","question":"career guidance"}' > /dev/null
```

**What to check:** second call's wall time is much lower (no `simulateLatency` delay was
incurred), and its `upstream_fetch` log entry shows `cacheHit: true` with `attempts: 0` for
every service (Panchang is cached per-date, so it hits across different `userId`s too, on the
same day).

### 7. Validation & error handling

```bash
# Missing userId
curl -s -X POST http://localhost:3000/personalize -H 'content-type: application/json' -d '{"question":"hi"}'
# → 400 {"error":"`userId` is required and must be a non-empty string."}

# Empty question
curl -s -X POST http://localhost:3000/personalize -H 'content-type: application/json' -d '{"userId":"user_101","question":"   "}'
# → 400 {"error":"`question` is required and must be a non-empty string."}

# Malformed JSON (also covers top-level JSON primitives like a bare string or `null` —
# Express's body parser runs in strict mode and rejects anything but a top-level object/array
# before the handler ever sees it)
curl -s -X POST http://localhost:3000/personalize -H 'content-type: application/json' -d '{"userId":'
# → 400 {"error":"Malformed JSON body."}

# Array body (valid JSON, parses fine, but has no userId/question fields)
curl -s -X POST http://localhost:3000/personalize -H 'content-type: application/json' -d '[1,2,3]'
# → 400 {"error":"`userId` is required and must be a non-empty string."}
```

`validateRequestBody`'s "Request body must be a JSON object" branch
(`src/core/requestPipeline.ts`) exists for direct/unit-level calls — it's not reachable over
HTTP since Express's JSON body parser already rejects non-object/array top-level JSON before the
route handler runs.

### 8. Unknown user (no real backing record)

The mock services never "404" — they deterministically generate data for any `userId` string,
including ones that don't correspond to a real user. This mirrors what happens if a client
sends an unrecognized ID rather than crashing:

```bash
curl -s -X POST http://localhost:3000/debug/personalization -H 'content-type: application/json' \
  -d '{"userId":"totally_unknown_user_xyz","question":"general guidance"}'
```

**What to check:** still returns a `200` with a full personalization decision, not an error.

### 9. LLM provider swap

Default is the mock provider (no key required). To exercise a real provider:

```bash
# .env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
```

Restart the server, then re-run any `/personalize` command above — `answer` will now come from
the live model instead of the templated mock. `GeminiProvider` retries transient failures (10s
timeout, 2 retries, retries on timeout/network error/429/5xx, not on 4xx) — see
[src/llm/geminiProvider.ts](./src/llm/geminiProvider.ts).

### 10. Logging

Every request emits structured JSON log lines to stdout you can grep for:

| event                    | when                                  |
| ------------------------- | -------------------------------------- |
| `upstream_fetch`          | after all 4 upstream calls settle — per-service status/cacheHit/latency/attempts |
| `personalization_decision`| after the engine runs — intent/selected/excluded/language/tone/confidence |
| `prompt_built`            | after the prompt string is assembled — `wordCount`, `estimatedTokens` |
| `request_complete`        | end of a successful `/personalize` call — `totalLatencyMs`, `llmLatencyMs` |
| `request_failed`          | on `no_context` or `llm_error` failure |
| `unhandled_error`         | anything caught by the global error middleware |

```bash
npm run dev | grep '"event":"upstream_fetch"'
```
