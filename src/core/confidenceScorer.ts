export interface ConfidenceInput {
  primaryTotal: number;
  primaryResolved: number;
  secondaryTotal: number;
  secondaryResolved: number;
}

// Derived purely from how much of the primary/secondary context actually
// resolved — never from the LLM self-reporting.
export function scoreConfidence(input: ConfidenceInput): "HIGH" | "MEDIUM" | "LOW" {
  const { primaryTotal, primaryResolved, secondaryTotal, secondaryResolved } = input;

  const primaryMissing = primaryTotal - primaryResolved;
  const secondaryMissing = secondaryTotal - secondaryResolved;

  if (primaryTotal > 0 && primaryMissing === 0 && secondaryMissing === 0) {
    return "HIGH";
  }

  if (primaryTotal === 0) {
    return "LOW";
  }

  const primaryMissingRatio = primaryMissing / primaryTotal;

  if (primaryMissingRatio >= 0.5) {
    return "LOW";
  }

  return "MEDIUM";
}
