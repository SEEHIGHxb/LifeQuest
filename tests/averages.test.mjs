// Tests for the derived population-average radar overlay (node --test).
//
// AVERAGE_ASPECT_SCORES is computed by running a cited reference person
// through the real aspect calculators, so these tests pin its SHAPE exactly
// but its VALUES only within a band: a deliberate formula change may move an
// average a little, and that's fine — but a change that wrecks an average
// (e.g. a broken normalizer pushing "average mental" to 5/100) must fail
// loudly here rather than quietly mislead everyone's radar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";

// Hand-computed from the reference inputs documented in averages.js.
const EXPECTED = {
  finance: 55,
  physical: 62,
  mental: 69,
  relationships: 70,
  personalGoals: 59,
  socialContribution: 32,
  environment: 50,
  humanityFuture: 44
};
const TOLERANCE = 15;

test("average table covers exactly the eight aspects", () => {
  assert.deepEqual(
    Object.keys(AVERAGE_ASPECT_SCORES).sort(),
    Object.keys(EXPECTED).sort()
  );
});

test("every average is an integer within 0-100", () => {
  for (const [aspect, value] of Object.entries(AVERAGE_ASPECT_SCORES)) {
    assert.ok(Number.isInteger(value), `${aspect}: expected integer, got ${value}`);
    assert.ok(value >= 0 && value <= 100, `${aspect}: ${value} out of 0-100`);
  }
});

test("every average stays near its documented reference value", () => {
  for (const [aspect, expected] of Object.entries(EXPECTED)) {
    const actual = AVERAGE_ASPECT_SCORES[aspect];
    assert.ok(
      Math.abs(actual - expected) <= TOLERANCE,
      `${aspect}: ${actual} drifted more than ±${TOLERANCE} from the documented ${expected} — ` +
      "a calculator change moved the population average; re-derive and update averages.js"
    );
  }
});

test("the average table is frozen", () => {
  assert.ok(Object.isFrozen(AVERAGE_ASPECT_SCORES));
});
