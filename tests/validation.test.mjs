// Tests for the onboarding input-validation + coverage module (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateProfile,
  buildProvidedFlags,
  buildAnsweredFlags,
  FIELD_CONSTRAINTS,
  NUMERIC_FIELD_KEYS,
  INSTRUMENT_KEYS
} from "../validation.js";

const VALID = {
  income: 20000, savingsRate: 15, digitalLiteracy: 60, weeklyLearningHours: 5,
  weeklyVigorousDays: 2, weeklyVigorousMins: 30, weeklyModerateDays: 1, weeklyModerateMins: 20,
  weeklyWalkingDays: 3, weeklyWalkingMins: 20, weight: 60, height: 170, sleepHours: 7,
  vegetablePortions: 3, waterLiters: 2, singleUsePlastics: 5, monthlyDonations: 500,
  volunteeringHours: 4
};

test("a fully in-range profile passes with no errors", () => {
  const { ok, errors } = validateProfile(VALID);
  assert.equal(ok, true);
  assert.deepEqual(errors, {});
});

test("out-of-range values are rejected on the right fields", () => {
  const { ok, errors } = validateProfile({
    ...VALID, weight: 5000, height: 0, income: -1, savingsRate: 150
  });
  assert.equal(ok, false);
  assert.ok(errors.weight, "absurd weight flagged");
  assert.ok(errors.height, "zero height flagged");
  assert.ok(errors.income, "negative income flagged");
  assert.ok(errors.savingsRate, "over-100% savings rate flagged");
  // Message carries the boundary values so the user knows the range.
  assert.match(errors.weight, /20/);
  assert.match(errors.weight, /400/);
});

test("boundary values are inclusive (min and max both pass)", () => {
  const { ok } = validateProfile({
    ...VALID, weight: FIELD_CONSTRAINTS.weight.min, height: FIELD_CONSTRAINTS.height.max,
    sleepHours: 0, savingsRate: 100
  });
  assert.equal(ok, true);
});

test("blank optional fields are allowed (they fall back to defaults)", () => {
  const { ok, errors } = validateProfile({ ...VALID, monthlyDonations: "", volunteeringHours: "  " });
  assert.equal(ok, true, "empty/whitespace-only fields skip validation");
  assert.equal(errors.monthlyDonations, undefined);
});

test("non-numeric input is rejected as not-a-number", () => {
  const { ok, errors } = validateProfile({ ...VALID, weight: "heavy" });
  assert.equal(ok, false);
  assert.match(errors.weight, /number/i);
});

test("an empty payload is valid (every field optional/absent)", () => {
  assert.deepEqual(validateProfile({}), { ok: true, errors: {} });
  assert.deepEqual(validateProfile(), { ok: true, errors: {} });
});

test("buildProvidedFlags marks touched fields true and the rest false", () => {
  const flags = buildProvidedFlags(new Set(["income", "weight"]));
  assert.equal(flags.income, true);
  assert.equal(flags.weight, true);
  assert.equal(flags.height, false);
  // Every constrained field is represented, none missing.
  assert.deepEqual(Object.keys(flags).sort(), [...NUMERIC_FIELD_KEYS].sort());
});

test("buildAnsweredFlags covers all instruments and accepts an array", () => {
  const flags = buildAnsweredFlags(["who5", "st5"]);
  assert.equal(flags.who5, true);
  assert.equal(flags.st5, true);
  assert.equal(flags.gse, false);
  assert.deepEqual(Object.keys(flags).sort(), [...INSTRUMENT_KEYS].sort());
});

test("empty coverage yields all-false flag maps", () => {
  assert.ok(Object.values(buildProvidedFlags(new Set())).every(v => v === false));
  assert.ok(Object.values(buildAnsweredFlags([])).every(v => v === false));
});
