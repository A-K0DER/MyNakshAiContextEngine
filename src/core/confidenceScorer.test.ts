import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreConfidence } from "./confidenceScorer";

test("HIGH when all primary and secondary context resolved", () => {
  const result = scoreConfidence({
    primaryTotal: 3,
    primaryResolved: 3,
    secondaryTotal: 1,
    secondaryResolved: 1,
  });
  assert.equal(result, "HIGH");
});

test("MEDIUM when secondary context missing but all primary resolved", () => {
  const result = scoreConfidence({
    primaryTotal: 3,
    primaryResolved: 3,
    secondaryTotal: 1,
    secondaryResolved: 0,
  });
  assert.equal(result, "MEDIUM");
});

test("MEDIUM when less than half of primary context is missing", () => {
  const result = scoreConfidence({
    primaryTotal: 3,
    primaryResolved: 2,
    secondaryTotal: 1,
    secondaryResolved: 1,
  });
  assert.equal(result, "MEDIUM");
});

test("LOW when half or more of primary context is missing", () => {
  const result = scoreConfidence({
    primaryTotal: 2,
    primaryResolved: 1,
    secondaryTotal: 1,
    secondaryResolved: 1,
  });
  assert.equal(result, "LOW");
});

test("LOW when no primary context is resolved", () => {
  const result = scoreConfidence({
    primaryTotal: 3,
    primaryResolved: 0,
    secondaryTotal: 1,
    secondaryResolved: 1,
  });
  assert.equal(result, "LOW");
});

test("LOW when there is no primary context defined for the intent", () => {
  const result = scoreConfidence({
    primaryTotal: 0,
    primaryResolved: 0,
    secondaryTotal: 0,
    secondaryResolved: 0,
  });
  assert.equal(result, "LOW");
});
