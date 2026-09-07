import { randomUUID } from "crypto";
import { Router } from "express";
import { getLLMProvider } from "../llm/llmProvider";
import { buildPrompt } from "../core/promptBuilder";
import {
  InvalidRequestError,
  NoContextAvailableError,
  runContextAndDecisionPipeline,
  validateRequestBody,
} from "../core/requestPipeline";
import { PersonalizeResponseBody } from "../types";
import { logEvent } from "../logger";

export const personalizeRouter = Router();
const llmProvider = getLLMProvider();

personalizeRouter.post("/personalize", async (req, res) => {
  const requestId = randomUUID();
  const requestStart = Date.now();

  let body;
  try {
    body = validateRequestBody(req.body);
  } catch (err) {
    if (err instanceof InvalidRequestError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  try {
    const { ctx, decision } = await runContextAndDecisionPipeline(requestId, body.userId, body.question);

    const { prompt, wordCount, estimatedTokens } = buildPrompt(body.question, decision, ctx.user.data);

    logEvent("prompt_built", { requestId, userId: body.userId, wordCount, estimatedTokens });

    const llmStart = Date.now();
    const llmResult = await llmProvider.generate(prompt);
    const llmLatencyMs = Date.now() - llmStart;

    const responseBody: PersonalizeResponseBody = {
      answer: llmResult.answer,
      confidence: decision.confidence,
      sourcesUsed: Object.keys(decision.selectedContext),
    };

    logEvent("request_complete", {
      requestId,
      userId: body.userId,
      totalLatencyMs: Date.now() - requestStart,
      llmLatencyMs,
      confidence: decision.confidence,
    });

    res.status(200).json(responseBody);
  } catch (err) {
    if (err instanceof NoContextAvailableError) {
      logEvent("request_failed", { requestId, userId: body.userId, reason: "no_context" });
      res.status(500).json({ error: "Unable to fetch any context for this user." });
      return;
    }

    logEvent("request_failed", {
      requestId,
      userId: body.userId,
      reason: "llm_error",
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: "Failed to generate a response." });
  }
});
