import { Intent } from "../types";

// Deterministic keyword scoring — no LLM call. Each keyword hit adds weight
// to its intent; the highest-scoring intent wins, "general" is the fallback.
const INTENT_KEYWORDS: Record<Exclude<Intent, "general">, string[]> = {
  career: [
    "job",
    "career",
    "work",
    "promotion",
    "business",
    "profession",
    "boss",
    "interview",
    "resign",
    "resignation",
    "office",
    "employment",
    "startup",
    "switch",
  ],
  relationship: [
    "marriage",
    "relationship",
    "partner",
    "love",
    "spouse",
    "husband",
    "wife",
    "boyfriend",
    "girlfriend",
    "breakup",
    "divorce",
    "engagement",
    "wedding",
    "compatibility",
  ],
  health: [
    "health",
    "illness",
    "sick",
    "disease",
    "surgery",
    "medical",
    "fitness",
    "diet",
    "mental health",
    "stress",
    "recovery",
    "injury",
  ],
  finance: [
    "money",
    "finance",
    "financial",
    "investment",
    "invest",
    "loan",
    "debt",
    "property",
    "wealth",
    "savings",
    "stock",
    "income",
    "buy a house",
    "expenses",
  ],
};

export function detectIntent(question: string): Intent {
  const text = question.toLowerCase();
  const scores: Record<Exclude<Intent, "general">, number> = {
    career: 0,
    relationship: 0,
    health: 0,
    finance: 0,
  };

  for (const intent of Object.keys(INTENT_KEYWORDS) as Exclude<Intent, "general">[]) {
    for (const keyword of INTENT_KEYWORDS[intent]) {
      if (text.includes(keyword)) {
        scores[intent] += 1;
      }
    }
  }

  let bestIntent: Intent = "general";
  let bestScore = 0;
  for (const intent of Object.keys(scores) as Exclude<Intent, "general">[]) {
    if (scores[intent] > bestScore) {
      bestScore = scores[intent];
      bestIntent = intent;
    }
  }

  return bestIntent;
}
