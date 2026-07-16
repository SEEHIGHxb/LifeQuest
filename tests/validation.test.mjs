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

// --- RESPONSE QUALITY (G3): straight-line detection ---
// Only mixed-keyed instruments (reverse-keyed items present) are judged: on
// those, an honest respondent cannot sit at the same option POSITION for every
// item without contradicting themselves.
import { isStraightLined } from "../validation.js";
import { INSTRUMENTS, DEEP_INSTRUMENTS } from "../surveys.js";

// Answers that all sit at option position `pos` of each item.
function samePosition(instrument, pos) {
  return instrument.items.map(it => it.options[Math.min(pos, it.options.length - 1)].v);
}

test("all-same-position answers on the mixed-keyed CFPB are flagged", () => {
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, samePosition(INSTRUMENTS.cfpb, 0)), true);
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, samePosition(INSTRUMENTS.cfpb, 2)), true);
});

test("varied answers on the CFPB are never flagged", () => {
  // A coherent "bad finances" pattern: describes-me items at the top, the
  // positively-worded item 4 at the bottom — different positions, no flag.
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, [0, 0, 0, 0, 0]), false);
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, [4, 4, 4, 4, 4]), false);
});

test("uniformly-keyed instruments are never judged, even when identical", () => {
  for (const key of ["who5", "st5", "lsns", "ucla", "gse", "grit", "ptm", "geb", "lfis", "jss"]) {
    const instr = INSTRUMENTS[key];
    assert.equal(isStraightLined(instr, samePosition(instr, 0)), false, `${key} must not be judged`);
  }
});

test("mixed-keyed deep instruments are flagged on straight-lining, not on varied answers", () => {
  for (const key of ["cfpb10", "pss10", "grit12", "rses", "cfc12", "ras7"]) {
    const instr = DEEP_INSTRUMENTS[key];
    assert.equal(isStraightLined(instr, samePosition(instr, 0)), true, `${key} straight-line must flag`);
    // Alternate between two positions — any real variation clears the flag.
    const varied = instr.items.map((it, i) => it.options[i % 2].v);
    assert.equal(isStraightLined(instr, varied), false, `${key} varied answers must not flag`);
  }
});

test("all-default deep answers are flagged: clicking through cannot verify an aspect", () => {
  // Deep defaults are deliberate midpoints, which sit at the SAME option
  // position across keyings — an untouched submission reads as careless.
  for (const key of ["cfpb10", "pss10", "grit12", "rses", "cfc12", "ras7"]) {
    const instr = DEEP_INSTRUMENTS[key];
    assert.equal(isStraightLined(instr, instr.items.map(it => it.def)), true, `${key} all-defaults must flag`);
  }
});

test("malformed answers are never flagged (wrong length, unknown values)", () => {
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, [0, 0, 0]), false);
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, [9, 9, 9, 9, 9]), false);
  assert.equal(isStraightLined(INSTRUMENTS.cfpb, null), false);
});
