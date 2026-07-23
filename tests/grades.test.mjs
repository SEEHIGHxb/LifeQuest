// Tests for letter grades and the Balance Index (node --test).
//
// Two things are pinned hard here because both are claims about a person:
//   - grade band EDGES, so a percentile never silently changes letter;
//   - the balance property, i.e. that a balanced life beats a spiky one at an
//     identical arithmetic mean. That property is the entire reason the index
//     is a harmonic mean rather than an average, so it is a test, not a note.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GRADE_BANDS, GRADE_PRIORITY, BALANCE_BANDS,
  gradeForPercentile, gradeForBenchmark, gradeAllAspects,
  isBottomGrade, balanceIndex, balanceBand, weakestAspect, relativeToPopulation
} from "../grades.js";
import { ASPECT_KEYS } from "../aspects.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";

// Invert relativeToPopulation: the raw score whose population-relative standing
// is `rel` for an aspect whose population average is `avg`. Lets these tests
// build profiles by desired RELATIVE standing (50 = the average person), which
// is the scale the Balance Index now runs on.
const rawForRelative = (rel, avg) =>
  rel <= 50 ? (rel * avg) / 50 : avg + ((rel - 50) * (100 - avg)) / 50;
import { getAllBenchmarks } from "../benchmarks.js";
import { getMentalHealthNotice } from "../suggestions.js";

const uniform = value => Object.fromEntries(ASPECT_KEYS.map(k => [k, value]));

// --- GRADE BANDS ---

test("grade band edges land on the documented letter", () => {
  const cases = [
    [99, "A"], [90, "A"], [89, "B"],
    [70, "B"], [69, "C"],
    [30, "C"], [29, "D"],
    [10, "D"], [9, "F"], [1, "F"]
  ];
  for (const [percentile, expected] of cases) {
    assert.equal(gradeForPercentile(percentile).grade, expected,
      `percentile ${percentile} should grade ${expected}`);
  }
});

test("grade bands are contiguous and descending, covering 0 upward", () => {
  const mins = GRADE_BANDS.map(b => b.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a), "bands must descend");
  assert.equal(mins[mins.length - 1], 0, "lowest band must start at 0");
  assert.equal(new Set(GRADE_BANDS.map(b => b.grade)).size, GRADE_BANDS.length);
});

test("every grade letter has a priority weight", () => {
  for (const band of GRADE_BANDS) {
    assert.ok(Number.isFinite(GRADE_PRIORITY[band.grade]),
      `${band.grade} has no GRADE_PRIORITY entry`);
  }
  assert.ok(GRADE_PRIORITY.F > GRADE_PRIORITY.D, "F must outrank D for attention");
  assert.ok(GRADE_PRIORITY.D > GRADE_PRIORITY.C);
});

test("non-numeric percentiles grade to null rather than a letter", () => {
  for (const bad of [undefined, null, NaN, "72"]) {
    assert.equal(gradeForPercentile(bad), null);
  }
});

// --- UNGRADED ASPECTS ---

test("a null benchmark yields no grade instead of falling back to a score", () => {
  assert.equal(gradeForBenchmark(null), null);
  assert.equal(gradeForBenchmark(undefined), null);
  assert.equal(gradeForBenchmark({ method: "estimate" }), null);
});

test("survey aspects are ungraded until a baseline exists", () => {
  // No baseline: mental/relationships/personalGoals benchmarks return null,
  // so they must come back ungraded — never graded off the raw score.
  const state = { profile: { income: 15000, region: "Provinces" }, baseline: null };
  const grades = gradeAllAspects(getAllBenchmarks(state));

  assert.deepEqual(Object.keys(grades).sort(), [...ASPECT_KEYS].sort());
  for (const key of ["mental", "relationships", "personalGoals"]) {
    assert.equal(grades[key], null, `${key} must be ungraded without a baseline`);
  }
  for (const key of ["finance", "physical", "socialContribution", "environment", "humanityFuture"]) {
    assert.ok(grades[key] && grades[key].grade, `${key} should be gradeable from the profile alone`);
  }
});

test("gradeAllAspects tolerates a missing benchmark set", () => {
  const grades = gradeAllAspects(null);
  assert.equal(Object.keys(grades).length, ASPECT_KEYS.length);
  assert.ok(Object.values(grades).every(g => g === null));
});

// --- DUTY OF CARE ---
//
// The plan's non-negotiable: a bottom-decile grade on `mental` must never
// render as a bare "F". The views attach getMentalHealthNotice() — this test
// proves the notice is actually AVAILABLE whenever the grade is F, i.e. that
// the WHO-5 cutoffs of the two systems cannot drift apart and leave an F
// showing with no support routing behind it.
test("an F on mental always comes with a support notice available", () => {
  for (let who5 = 0; who5 <= 25; who5++) {
    const state = { profile: {}, baseline: { who5, st5: 0, ucla: 3, lsns: 17, gse: 18 } };
    const grade = gradeForBenchmark(getAllBenchmarks(state).mental);
    if (isBottomGrade(grade)) {
      assert.ok(getMentalHealthNotice(state),
        `WHO-5 raw ${who5} grades F but produces no support notice — ` +
        "the grade cutoff has drifted past WHO5_CONCERN_MAX in suggestions.js");
    }
  }
});

test("isBottomGrade only fires on F", () => {
  assert.equal(isBottomGrade(gradeForPercentile(5)), true);
  assert.equal(isBottomGrade(gradeForPercentile(10)), false);
  assert.equal(isBottomGrade(gradeForPercentile(95)), false);
  assert.equal(isBottomGrade(null), false);
});

// --- BALANCE INDEX ---

test("a profile sitting at the population average scores exactly 50", () => {
  // The whole point of the population-relative scale: being typical on every
  // aspect maps to 50, no matter that the raw averages range from ~32 to ~70.
  assert.equal(balanceIndex(AVERAGE_ASPECT_SCORES), 50);
});

test("an aspect the population scores low on no longer anchors the index down", () => {
  // socialContribution is the lowest-average aspect (~32). Sitting AT that
  // average reads as 50 there, not ~32 — so a person average everywhere lands
  // at 50, never dragged into the 40s by one structurally-low aspect.
  const rel = relativeToPopulation(
    AVERAGE_ASPECT_SCORES.socialContribution, AVERAGE_ASPECT_SCORES.socialContribution);
  assert.equal(Math.round(rel), 50);
});

test("balanced beats spiky at an identical mean RELATIVE standing", () => {
  // Both average a relative standing of 50; the spiky one collapses one aspect
  // (relative 1) and compensates with seven at 57 — (7*57 + 1)/8 = 50. The
  // harmonic mean must still punish the collapse.
  const even = { ...AVERAGE_ASPECT_SCORES }; // every aspect at relative 50
  const spikyRel = { humanityFuture: 1 };
  for (const k of ASPECT_KEYS) if (k !== "humanityFuture") spikyRel[k] = 57;
  const spiky = Object.fromEntries(
    ASPECT_KEYS.map(k => [k, rawForRelative(spikyRel[k], AVERAGE_ASPECT_SCORES[k])])
  );
  assert.equal(balanceIndex(even), 50);
  assert.ok(balanceIndex(spiky) < 20,
    `spiky profile scored ${balanceIndex(spiky)} — the index stopped rewarding balance`);
});

test("the index never exceeds the mean of the relative standings", () => {
  // Harmonic <= arithmetic still holds, but the arithmetic bound is now the
  // mean of each aspect's POPULATION-RELATIVE standing, not of the raw scores.
  const samples = [
    uniform(50),
    { finance: 90, physical: 10, mental: 50, relationships: 60, personalGoals: 40, socialContribution: 30, environment: 70, humanityFuture: 20 },
    { finance: 1, physical: 99, mental: 50, relationships: 50, personalGoals: 50, socialContribution: 50, environment: 50, humanityFuture: 50 }
  ];
  for (const aspects of samples) {
    const relMean = ASPECT_KEYS
      .map(k => relativeToPopulation(aspects[k], AVERAGE_ASPECT_SCORES[k]))
      .reduce((s, v) => s + v, 0) / ASPECT_KEYS.length;
    assert.ok(balanceIndex(aspects) <= Math.round(relMean) + 1,
      "harmonic mean must not exceed the arithmetic mean of relative standings");
  }
});

test("zero and missing scores do not produce Infinity or NaN", () => {
  for (const aspects of [uniform(0), {}, null, { finance: 80 }]) {
    const index = balanceIndex(aspects);
    assert.ok(Number.isInteger(index), `expected an integer, got ${index}`);
    assert.ok(index >= 0 && index <= 100, `${index} out of 0-100`);
  }
});

test("lifting the relatively-weakest aspect moves the index more than a strong one", () => {
  const base = { ...AVERAGE_ASPECT_SCORES, humanityFuture: 15 }; // its relative min
  const liftWeak = { ...base, humanityFuture: 30 };
  const liftStrong = { ...base, finance: base.finance + 15 };
  assert.ok(balanceIndex(liftWeak) - balanceIndex(base) > balanceIndex(liftStrong) - balanceIndex(base),
    "the index must reward lifting a neglected aspect over polishing a strong one");
});

// --- BANDS & WEAKEST ---

test("balance bands are contiguous and cover the whole range", () => {
  const mins = BALANCE_BANDS.map(b => b.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a));
  assert.equal(mins[mins.length - 1], 0);
  for (const index of [0, 29, 30, 49, 50, 74, 75, 100]) {
    assert.ok(balanceBand(index), `no band for index ${index}`);
  }
  // 50 is the population average and must read "steady", never "uneven".
  assert.equal(balanceBand(75).key, "strong");
  assert.equal(balanceBand(74).key, "steady");
  assert.equal(balanceBand(50).key, "steady");
  assert.equal(balanceBand(49).key, "uneven");
  assert.equal(balanceBand(30).key, "uneven");
  assert.equal(balanceBand(29).key, "strained");
  assert.equal(balanceBand(0).key, "strained");
});

test("weakestAspect names the aspect with the lowest population-relative standing", () => {
  // environment forced far below its average; every other aspect sits at its
  // average (relative 50), so environment must be the weakest.
  const aspects = { ...AVERAGE_ASPECT_SCORES, environment: 5 };
  const weak = weakestAspect(aspects);
  assert.equal(weak.aspect, "environment");
  assert.ok(weak.score < 50);
  assert.equal(weakestAspect({}).score, 0);
});
