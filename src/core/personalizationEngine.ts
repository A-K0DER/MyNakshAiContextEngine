import { PERSONALIZATION_RULES } from "../config/personalizationRules";
import { CONTEXT_RESOLVERS } from "./contextResolvers";
import { detectIntent } from "./intentDetector";
import { scoreConfidence } from "./confidenceScorer";
import { FetchedContext, PersonalizationDecision } from "../types";

// Zero dependency on the LLM — fully testable/callable on its own, and what
// /debug/personalization relies on directly.
export function buildPersonalizationDecision(
  question: string,
  ctx: FetchedContext,
): PersonalizationDecision {
  const intent = detectIntent(question);
  const rule = PERSONALIZATION_RULES[intent];

  const selectedContext: Record<string, string> = {};
  const excludedContext: string[] = [...rule.excludedContext];

  const resolveFields = (fields: string[]) => {
    for (const field of fields) {
      const resolver = CONTEXT_RESOLVERS[field];
      const value = resolver ? resolver(ctx) : undefined;
      if (value !== undefined) {
        selectedContext[field] = value;
      } else {
        excludedContext.push(field);
      }
    }
  };

  resolveFields(rule.primaryContext);
  resolveFields(rule.secondaryContext);

  const language = ctx.user.data?.language ?? rule.defaultLanguage;
  const tone = ctx.user.data?.tonePreference ?? rule.defaultTone;

  const primaryResolvedCount = rule.primaryContext.filter((f) => f in selectedContext).length;
  const secondaryResolvedCount = rule.secondaryContext.filter((f) => f in selectedContext).length;

  const confidence = scoreConfidence({
    primaryTotal: rule.primaryContext.length,
    primaryResolved: primaryResolvedCount,
    secondaryTotal: rule.secondaryContext.length,
    secondaryResolved: secondaryResolvedCount,
  });

  return {
    intent,
    selectedContext,
    excludedContext,
    language,
    tone,
    maxWords: rule.defaultMaxWords,
    confidence,
  };
}
