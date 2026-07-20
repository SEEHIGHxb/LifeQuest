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
  isBottomGrade, balanceIndex, balanceBand, weakestAspect
} from "../grades.js";
import { ASPECT_KEYS } from "../aspects.js";
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

test("a uniform profile scores its own value", () => {
  assert.equal(balanceIndex(uniform(70)), 70);
  assert.equal(balanceIndex(uniform(100)), 100);
});

test("balanced beats spiky at an identical arithmetic mean", () => {
  const balanced = uniform(70);
  // Same arithmetic mean of 70: seven at ~78.6 (rounded 79/78) and one at 10.
  const spiky = {
    finance: 79, physical: 79, mental: 79, relationships: 79,
    personalGoals: 78, socialContribution: 78, environment: 78, humanityFuture: 10
  };
  const meanOf = a => ASPECT_KEYS.reduce((s, k) => s + a[k], 0) / ASPECT_KEYS.length;
  assert.ok(Math.abs(meanOf(balanced) - meanOf(spiky)) < 1, "test fixtures must share a mean");

  assert.equal(balanceIndex(balanced), 70);
  assert.ok(balanceIndex(spiky) < 50,
    `spiky profile scored ${balanceIndex(spiky)} — the index stopped rewarding balance`);
});

test("the index never exceeds the arithmetic mean", () => {
  const samples = [
    uniform(50),
    { finance: 90, physical: 10, mental: 50, relationships: 60, personalGoals: 40, socialContribution: 30, environment: 70, humanityFuture: 20 },
    { finance: 1, physical: 99, mental: 50, relationships: 50, personalGoals: 50, socialContribution: 50, environment: 50, humanityFuture: 50 }
  ];
  for (const aspects of samples) {
    const mean = ASPECT_KEYS.reduce((s, k) => s + aspects[k], 0) / ASPECT_KEYS.length;
    assert.ok(balanceIndex(aspects) <= Math.round(mean) + 1,
      "harmonic mean must not exceed the arithmetic mean");
  }
});

test("zero and missing scores do not produce Infinity or NaN", () => {
  for (const aspects of [uniform(0), {}, null, { finance: 80 }]) {
    const index = balanceIndex(aspects);
    assert.ok(Number.isInteger(index), `expected an integer, got ${index}`);
    assert.ok(index >= 0 && index <= 100, `${index} out of 0-100`);
  }
});

test("lifting the weakest aspect moves the index more than lifting the strongest", () => {
  const base = { ...uniform(70), humanityFuture: 20 };
  const liftWeak = { ...base, humanityFuture: 30 };
  const liftStrong = { ...base, finance: 80 };
  assert.ok(balanceIndex(liftWeak) - balanceIndex(base) > balanceIndex(liftStrong) - balanceIndex(base),
    "the index must reward lifting a neglected aspect over polishing a strong one");
});

// --- BANDS & WEAKEST ---

test("balance bands are contiguous and cover the whole range", () => {
  const mins = BALANCE_BANDS.map(b => b.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a));
  assert.equal(mins[mins.length - 1], 0);
  for (const index of [0, 39, 40, 59, 60, 79, 80, 100]) {
    assert.ok(balanceBand(index), `no band for index ${index}`);
  }
  assert.equal(balanceBand(80).key, "strong");
  assert.equal(balanceBand(79).key, "steady");
  assert.equal(balanceBand(0).key, "strained");
});

test("weakestAspect names the lowest-scoring aspect", () => {
  const aspects = { ...uniform(70), environment: 12 };
  assert.deepEqual(weakestAspect(aspects), { aspect: "environment", score: 12 });
  assert.equal(weakestAspect({}).score, 0);
});
