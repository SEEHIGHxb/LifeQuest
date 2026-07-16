// Scoring-integrity guards: the instrument DEFINITIONS (surveys.js) and the
// score TRANSFORMS (scoring.js) encode the same raw-score ranges in two
// different files. A normalizer like lsnsScore hard-codes "/ 30" and is only
// correct while the LSNS-6 options really sum to 0–30; editing an option value
// or adding an item would silently misscale every downstream score with no
// failing test. These tests derive each instrument's true raw min/max from its
// item definitions and pin every normalizer's endpoints and direction to them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, DEEP_INSTRUMENTS } from "../surveys.js";
import {
  cfpbScore,
  sleepQualityScore,
  st5Resilience,
  who5Score,
  lsnsScore,
  uclaLowLoneliness,
  rasScore,
  gseScore,
  gritScore,
  DEEP_NORM,
  calculateFinanceScore,
  calculatePhysicalScore,
  calculateMentalScore,
  calculateRelationshipsScore,
  calculatePersonalGoalsScore,
  calculateSocialContributionScore,
  calculateEnvironmentScore,
  calculateHumanityFutureScore
} from "../scoring.js";

// True raw range of an instrument: the sum of each item's lowest/highest
// option values (answers are stored as option values and summed by rawSum).
function rawRange(instrument) {
  let min = 0;
  let max = 0;
  for (const item of instrument.items) {
    const values = item.options.map(o => o.v);
    min += Math.min(...values);
    max += Math.max(...values);
  }
  return { min, max };
}

// direction "positive": higher raw = healthier (minRaw -> 0, maxRaw -> 100).
// direction "inverted": higher raw = worse    (minRaw -> 100, maxRaw -> 0).
// `endpoints` overrides the 0/100 expectation for official published tables
// that deliberately do not span the full range (the CFPB IRT scores).
const ONBOARDING_NORMALIZERS = {
  // Official CFPB 5-item self-administered table, age 18-61: raw 0 -> 19, raw 20 -> 82.
  cfpb: { fn: raw => cfpbScore(raw, 25), direction: "positive", endpoints: { atMin: 19, atMax: 82 } },
  jss: { fn: sleepQualityScore, direction: "inverted" },
  st5: { fn: st5Resilience, direction: "inverted" },
  who5: { fn: who5Score, direction: "positive" },
  lsns: { fn: lsnsScore, direction: "positive" },
  ucla: { fn: uclaLowLoneliness, direction: "inverted" },
  ras: { fn: rasScore, direction: "positive" },
  gse: { fn: gseScore, direction: "positive" },
  grit: { fn: gritScore, direction: "positive" },
  ptm: null, // scored inside calculateSocialContributionScore (per-item, no sum normalizer)
  geb: null, // scored inside calculateEnvironmentScore (per-item, no sum normalizer)
  lfis: null // scored inside calculateHumanityFutureScore (per-item, no sum normalizer)
};

// Deep instruments share keys with DEEP_NORM; only PSS-10 stores a raw stress
// sum (higher = worse) — everything else is pre-oriented higher = healthier.
const DEEP_DIRECTIONS = { pss10: "inverted" };

function assertEndpointsAndMonotonic(name, fn, { min, max }, direction, endpoints) {
  const expected = endpoints || (direction === "positive" ? { atMin: 0, atMax: 100 } : { atMin: 100, atMax: 0 });
  assert.equal(fn(min), expected.atMin, `${name}(${min}) must be ${expected.atMin}`);
  assert.equal(fn(max), expected.atMax, `${name}(${max}) must be ${expected.atMax}`);
  // A single answer changing for the better must never lower the score.
  for (let raw = min; raw < max; raw++) {
    const step = fn(raw + 1) - fn(raw);
    if (direction === "positive") {
      assert.ok(step >= 0, `${name} must be non-decreasing: f(${raw + 1}) < f(${raw})`);
    } else {
      assert.ok(step <= 0, `${name} must be non-increasing: f(${raw + 1}) > f(${raw})`);
    }
    assert.ok(fn(raw) >= 0 && fn(raw) <= 100, `${name}(${raw}) must stay within 0-100`);
  }
}

test("every onboarding instrument has a normalizer guard, and vice versa", () => {
  assert.deepEqual(
    Object.keys(ONBOARDING_NORMALIZERS).sort(),
    Object.keys(INSTRUMENTS).sort(),
    "a new instrument must be added to ONBOARDING_NORMALIZERS with its direction (or null if scored per-item)"
  );
});

test("every deep instrument has a DEEP_NORM transform, and vice versa", () => {
  assert.deepEqual(
    Object.keys(DEEP_NORM).sort(),
    Object.keys(DEEP_INSTRUMENTS).sort(),
    "DEEP_NORM and DEEP_INSTRUMENTS must define the same instrument keys"
  );
});

test("onboarding normalizers match their instrument's derived raw range", () => {
  for (const [key, entry] of Object.entries(ONBOARDING_NORMALIZERS)) {
    if (!entry) continue;
    assertEndpointsAndMonotonic(key, entry.fn, rawRange(INSTRUMENTS[key]), entry.direction, entry.endpoints);
  }
});

// Official CFPB deep-table endpoints (10-item self-administered, age 18-61).
const DEEP_ENDPOINTS = { cfpb10: { atMin: 14, atMax: 86 } };

test("deep transforms match their instrument's derived raw range", () => {
  for (const [key, fn] of Object.entries(DEEP_NORM)) {
    const direction = DEEP_DIRECTIONS[key] || "positive";
    assertEndpointsAndMonotonic(`DEEP_NORM.${key}`, fn, rawRange(DEEP_INSTRUMENTS[key]), direction, DEEP_ENDPOINTS[key]);
  }
});

test("CFPB official tables use the 62+ band when age crosses the threshold", () => {
  assert.equal(cfpbScore(0, 62), 20);
  assert.equal(cfpbScore(20, 62), 90);
  assert.equal(cfpbScore(10, 61), 50, "age 61 stays in the 18-61 band");
  const deep = DEEP_NORM.cfpb10;
  assert.equal(deep(0, 62), 14);
  assert.equal(deep(40, 62), 95);
  assert.equal(deep(40, 61), 86, "age 61 stays in the 18-61 band");
});

test("every item's def is one of its own option values", () => {
  const all = { ...INSTRUMENTS, ...DEEP_INSTRUMENTS };
  for (const [key, instrument] of Object.entries(all)) {
    instrument.items.forEach((item, i) => {
      assert.ok(
        item.options.some(o => o.v === item.def),
        `${key} item ${i + 1}: def=${item.def} is not an option value`
      );
    });
  }
});

// --- Composite bounds: the 8 aspect calculators stay within 0-100 at both
// extremes of every input they accept. ---

function answers(instrumentKey, pick) {
  return INSTRUMENTS[instrumentKey].items.map(item => pick(...item.options.map(o => o.v)));
}
const best = key => answers(key, Math.max);
const worst = key => answers(key, Math.min);

const BEST_PROFILE = {
  income: 10000000, savingsRate: 100, region: "Bangkok", relationshipStatus: "Coupled",
  weeklyVigorousDays: 7, weeklyVigorousMins: 1440, weeklyModerateDays: 7, weeklyModerateMins: 1440,
  weeklyWalkingDays: 7, weeklyWalkingMins: 1440, weight: 60, height: 170, sleepHours: 8,
  vegetablePortions: 50, waterLiters: 15, weeklyLearningHours: 168, digitalLiteracy: 100,
  monthlyDonations: 10000000, volunteeringHours: 168, singleUsePlastics: 0, longTermInvestments: true
};
const WORST_PROFILE = {
  income: 0, savingsRate: 0, region: "Provinces", relationshipStatus: "Single",
  weeklyVigorousDays: 0, weeklyVigorousMins: 0, weeklyModerateDays: 0, weeklyModerateMins: 0,
  weeklyWalkingDays: 0, weeklyWalkingMins: 0, weight: 0, height: 0, sleepHours: 0,
  vegetablePortions: 0, waterLiters: 0, weeklyLearningHours: 0, digitalLiteracy: 0,
  monthlyDonations: 0, volunteeringHours: 0, singleUsePlastics: 100, longTermInvestments: false
};

// [name, scoreAtBestExtreme, scoreAtWorstExtreme]
const COMPOSITE_CASES = [
  ["finance", () => calculateFinanceScore(BEST_PROFILE, best("cfpb")), () => calculateFinanceScore(WORST_PROFILE, worst("cfpb"))],
  // JSS raw min = best sleep (inverted instrument), so best physical pairs with worst().
  ["physical", () => calculatePhysicalScore(BEST_PROFILE, worst("jss")), () => calculatePhysicalScore(WORST_PROFILE, best("jss"))],
  ["mental", () => calculateMentalScore(BEST_PROFILE, worst("st5"), best("who5")), () => calculateMentalScore(WORST_PROFILE, best("st5"), worst("who5"))],
  ["relationships (coupled)", () => calculateRelationshipsScore(BEST_PROFILE, best("lsns"), worst("ucla"), best("ras")), () => calculateRelationshipsScore({ ...WORST_PROFILE, relationshipStatus: "Coupled" }, worst("lsns"), best("ucla"), worst("ras"))],
  ["relationships (single)", () => calculateRelationshipsScore({ ...BEST_PROFILE, relationshipStatus: "Single" }, best("lsns"), worst("ucla"), null), () => calculateRelationshipsScore(WORST_PROFILE, worst("lsns"), best("ucla"), null)],
  ["personalGoals", () => calculatePersonalGoalsScore(BEST_PROFILE, best("gse"), best("grit")), () => calculatePersonalGoalsScore(WORST_PROFILE, worst("gse"), worst("grit"))],
  ["socialContribution", () => calculateSocialContributionScore(BEST_PROFILE, best("ptm")), () => calculateSocialContributionScore(WORST_PROFILE, worst("ptm"))],
  ["environment", () => calculateEnvironmentScore(BEST_PROFILE, best("geb")), () => calculateEnvironmentScore(WORST_PROFILE, worst("geb"))],
  ["humanityFuture", () => calculateHumanityFutureScore(BEST_PROFILE, best("lfis")), () => calculateHumanityFutureScore(WORST_PROFILE, worst("lfis"))]
];

test("all 8 aspect calculators stay within 0-100 at both extremes", () => {
  for (const [name, atBest, atWorst] of COMPOSITE_CASES) {
    const hi = atBest();
    const lo = atWorst();
    assert.ok(hi >= 0 && hi <= 100, `${name} best-case score ${hi} out of 0-100`);
    assert.ok(lo >= 0 && lo <= 100, `${name} worst-case score ${lo} out of 0-100`);
    assert.ok(hi > lo, `${name}: best-case answers (${hi}) must beat worst-case (${lo})`);
  }
});
