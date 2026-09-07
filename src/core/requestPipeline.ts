import { fetchAllContext } from "./fetchOrchestrator";
import { buildPersonalizationDecision } from "./personalizationEngine";
import { FetchedContext, PersonalizationDecision, PersonalizeRequestBody } from "../types";
import { logEvent } from "../logger";

export class InvalidRequestError extends Error {}
export class NoContextAvailableError extends Error {}

export function validateRequestBody(body: unknown): PersonalizeRequestBody {
  if (typeof body !== "object" || body === null) {
    throw new InvalidRequestError("Request body must be a JSON object.");
  }
  const { userId, question } = body as Record<string, unknown>;
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new InvalidRequestError("`userId` is required and must be a non-empty string.");
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new InvalidRequestError("`question` is required and must be a non-empty string.");
  }
  return { userId, question };
}

export interface PipelineResult {
  requestId: string;
  ctx: FetchedContext;
  decision: PersonalizationDecision;
  totalFetchLatencyMs: number;
}

export async function runContextAndDecisionPipeline(
  requestId: string,
  userId: string,
  question: string,
): Promise<PipelineResult> {
  const fetchStart = Date.now();
  const ctx = await fetchAllContext(userId);
  const totalFetchLatencyMs = Date.now() - fetchStart;

  const allFailed =
    ctx.user.status === "failed" &&
    ctx.kundli.status === "failed" &&
    ctx.horoscope.status === "failed" &&
    ctx.panchang.status === "failed";

  logEvent("upstream_fetch", {
    requestId,
    userId,
    totalFetchLatencyMs,
    user: summarizeResult(ctx.user),
    kundli: summarizeResult(ctx.kundli),
    horoscope: summarizeResult(ctx.horoscope),
    panchang: summarizeResult(ctx.panchang),
  });

  if (allFailed) {
    throw new NoContextAvailableError("All upstream services failed; no context available.");
  }

  const decision = buildPersonalizationDecision(question, ctx);

  logEvent("personalization_decision", {
    requestId,
    userId,
    intent: decision.intent,
    selectedContext: Object.keys(decision.selectedContext),
    excludedContext: decision.excludedContext,
    language: decision.language,
    tone: decision.tone,
    confidence: decision.confidence,
  });

  return { requestId, ctx, decision, totalFetchLatencyMs };
}

function summarizeResult(result: {
  status: string;
  cacheHit: boolean;
  latencyMs: number;
  attempts: number;
  error?: string;
}) {
  return {
    status: result.status,
    cacheHit: result.cacheHit,
    latencyMs: result.latencyMs,
    attempts: result.attempts,
    error: result.error,
  };
}
