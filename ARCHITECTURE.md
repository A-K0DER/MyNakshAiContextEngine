# Architecture

## Request flow

```mermaid
flowchart TD
    Client([Client])

    Client -->|POST /personalize or /debug/personalization| Validate[Validate request body]
    Validate -->|400| ClientErr([400 response])

    Validate --> Orchestrator[Fetch Orchestrator\nPromise.allSettled]

    subgraph Concurrent fetch, cached + retried
        Orchestrator --> UserSvc[User Service]
        Orchestrator --> KundliSvc[Kundli Service]
        Orchestrator --> HoroscopeSvc[Horoscope Service]
        Orchestrator --> PanchangSvc[Panchang Service\n(date-scoped, not per-user)]

        UserSvc <-.cache get/set (userId:user).-> Cache[(In-memory TTL Cache)]
        KundliSvc <-.cache get/set (userId:kundli).-> Cache
        HoroscopeSvc <-.cache get/set (userId:horoscope).-> Cache
        PanchangSvc <-.cache get/set (date:panchang).-> Cache
    end

    UserSvc --> Merge[FetchedContext\n(per-service status/data/latency)]
    KundliSvc --> Merge
    HoroscopeSvc --> Merge
    PanchangSvc --> Merge

    Merge -->|all 4 failed| HardFail([500: no context available])

    Merge --> Engine[Personalization Engine\n(config-driven, no LLM dependency)]
    Engine --> Rules[(personalizationRules.ts\nprimary/secondary/excluded per intent)]
    Engine --> Resolvers[(contextResolvers.ts\none resolver per field)]
    Engine --> Confidence[Confidence Scorer\nHIGH/MEDIUM/LOW from field coverage]

    Engine --> Decision[PersonalizationDecision\nintent, selectedContext, excludedContext,\nlanguage, tone, maxWords, confidence]

    Decision -->|/debug/personalization| DebugResp([200: decision JSON\nno LLM call])

    Decision -->|/personalize| PromptBuilder[Prompt Builder\ninjects only selectedContext]
    PromptBuilder --> LLM[LLM Provider\nMockProvider default /\nAnthropicProvider if key set]
    LLM -->|throws| LLMFail([500: LLM error])
    LLM --> Response([200: answer, confidence, sourcesUsed])
```

## Module responsibilities

| Module | Responsibility |
|---|---|
| `src/services/*Service.ts` | Mock upstream calls with randomized latency (~100-800ms) and ~10% failure rate |
| `src/services/mockData.ts` | Deterministic-by-seed mock payload generation |
| `src/core/cache.ts` | In-memory `Map`-based TTL cache; keyed `service:userId` except Panchang which is keyed `panchang:date` (shared across all users) |
| `src/core/fetchOrchestrator.ts` | Concurrent fetch (`Promise.allSettled`) + per-call timeout (`Promise.race`-style) + retry with exponential backoff (max 2 retries), cache-aware |
| `src/core/intentDetector.ts` | Deterministic keyword scoring over the question text → one of 5 intents |
| `src/config/personalizationRules.ts` | **Single source of truth**: per intent, primary/secondary/excluded context fields, default tone/language/maxWords |
| `src/core/contextResolvers.ts` | One small pure function per context field name, extracting a value from `FetchedContext` |
| `src/core/personalizationEngine.ts` | Reads the rule for the detected intent, resolves fields via the resolver map, applies user overrides for tone/language, delegates to the confidence scorer. Zero LLM dependency — independently testable and what `/debug/personalization` calls directly |
| `src/core/confidenceScorer.ts` | HIGH/MEDIUM/LOW purely from primary/secondary field resolution ratios |
| `src/core/promptBuilder.ts` | Per-intent prompt template, injects only `selectedContext` (never raw payloads), estimates word/token size |
| `src/llm/llmProvider.ts` | Provider selection (env-flag driven) |
| `src/llm/mockProvider.ts` | Default, zero-config templated response |
| `src/llm/realProvider.ts` | Anthropic Messages API via `fetch`, used only if `LLM_PROVIDER=anthropic` and a key is present |
| `src/core/requestPipeline.ts` | Shared validation + fetch-and-decide pipeline used by both routes |
| `src/routes/personalize.ts` | `POST /personalize` — full pipeline including LLM call |
| `src/routes/debugPersonalization.ts` | `POST /debug/personalization` — pipeline minus the LLM call |
| `src/logger.ts` | Structured JSON logging (requestId, per-service latency/cache-hit, prompt size, LLM latency) |

## Why config-driven, not if/else

The personalization engine takes the detected `Intent` and looks up one `IntentRule` object from
`PERSONALIZATION_RULES`. It then runs the same generic "resolve these fields" logic regardless of
which intent it is. Adding a 6th intent, or changing which fields are primary vs. secondary for
"career", is a change to `personalizationRules.ts` only — `personalizationEngine.ts` never
branches on intent.
