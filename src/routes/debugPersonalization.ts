import { randomUUID } from "crypto";
import { Router } from "express";
import {
  InvalidRequestError,
  NoContextAvailableError,
  runContextAndDecisionPipeline,
  validateRequestBody,
} from "../core/requestPipeline";
import { DebugPersonalizationResponseBody } from "../types";

export const debugPersonalizationRouter = Router();

// Does not call the LLM — returns the engine's internal decision only.
debugPersonalizationRouter.post("/debug/personalization", async (req, res) => {
  const requestId = randomUUID();

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
    const { decision } = await runContextAndDecisionPipeline(requestId, body.userId, body.question);

    const responseBody: DebugPersonalizationResponseBody = {
      intent: decision.intent,
      selectedContext: Object.keys(decision.selectedContext),
      excludedContext: decision.excludedContext,
      language: decision.language,
      tone: decision.tone,
    };

    res.status(200).json(responseBody);
  } catch (err) {
    if (err instanceof NoContextAvailableError) {
      res.status(500).json({ error: "Unable to fetch any context for this user." });
      return;
    }
    throw err;
  }
});
