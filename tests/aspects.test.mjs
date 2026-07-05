// Tests for aspect detail pages: components and trend series (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { getAspectDetail, ASPECT_KEYS, ASPECT_META } from "../aspects.js";

const PROFILE = {
  income: 15000,
  region: "Provinces",
  gender: "male",
  relationshipStatus: "Single",
  savingsRate: 10,
  digitalLiteracy: 60,
  weeklyLearningHours: 5,
  weeklyVigorousDays: 2,
  weeklyVigorousMins: 30,
  weeklyModerateDays: 0,
  weeklyModerateMins: 0,
  weeklyWalkingDays: 3,
  weeklyWalkingMins: 20,
  weight: 60,
  height: 170,
  sleepHours: 8,
  vegetablePortions: 5,
  waterLiters: 2.5,
  singleUsePlastics: 0,
  monthlyDonations: 500,
  volunteeringHours: 4,
  longTermInvestments: true
};

const BASELINE = {
  date: "2026-07-03T00:00:00.000Z",
  cfpb: 10, jss: 4, st5: 3, who5: 17, lsns: 17, ucla: 4,
  ras: null, gse: 18, grit: 14, ptm: 10, geb: 12, lfis: 10
};

const SNAPSHOTS = [
  { date: "2026-06-19T00:00:00.000Z", aspects: { physical: 40, finance: 50 } },
  { date: "2026-06-26T00:00:00.000Z", aspects: { physical: 45, finance: 52 } },
  { date: "2026-07-03T00:00:00.000Z", aspects: { physical: 48, finance: 55 } }
];

function makeState(overrides = {}) {
  return {
    profile: { ...PROFILE, ...(overrides.profile || {}) },
    baseline: "baseline" in overrides ? overrides.baseline : BASELINE,
    aspects: { finance: 55, physical: 48, mental: 60, relationships: 62, personalGoals: 58, socialContribution: 45, environment: 50, humanityFuture: 35 },
    snapshots: "snapshots" in overrides ? overrides.snapshots : SNAPSHOTS
  };
}

test("getAspectDetail rejects unknown keys and covers all aspects", () => {
  assert.equal(getAspectDetail(makeState(), "notAnAspect"), null);
  for (const key of ASPECT_KEYS) {
    const d = getAspectDetail(makeState(), key);
    assert.ok(d, `${key} detail exists`);
    assert.equal(d.key, key);
    assert.equal(d.label, ASPECT_META[key].label);
    assert.ok(d.components.length > 0, `${key} has components with a full baseline`);
    d.components.forEach(c => {
      assert.ok(c.value >= 0 && c.value <= 100, `${key}/${c.label} in 0-100`);
      assert.ok(c.label && c.detail, `${key} components carry label + detail`);
    });
  }
});

test("trend maps snapshots to the aspect's values in order", () => {
  const d = getAspectDetail(makeState(), "physical");
  assert.deepEqual(d.trend.map(t => t.value), [40, 45, 48]);
  assert.equal(d.trend[0].date, SNAPSHOTS[0].date);
  assert.deepEqual(getAspectDetail(makeState({ snapshots: [] }), "physical").trend, []);
});

test("trend treats missing aspect values in old snapshots as 0", () => {
  const d = getAspectDetail(makeState(), "mental"); // not present in SNAPSHOTS
  assert.deepEqual(d.trend.map(t => t.value), [0, 0, 0]);
});

test("survey-only aspects degrade gracefully without a baseline", () => {
  const noBase = makeState({ baseline: null });
  assert.equal(getAspectDetail(noBase, "mental").components.length, 0);
  assert.equal(getAspectDetail(noBase, "relationships").components.length, 0);
  // Mixed aspects keep their profile-derived components
  const physical = getAspectDetail(noBase, "physical");
  assert.ok(physical.components.length >= 3);
  assert.ok(physical.components.some(c => c.label === "Sleep duration"), "sleep falls back to duration-only without JSS baseline");
  assert.equal(getAspectDetail(noBase, "mental").benchmark, null);
});

test("physical components mirror the state.js scoring formulas", () => {
  const d = getAspectDetail(makeState(), "physical");
  const byLabel = Object.fromEntries(d.components.map(c => [c.label, c.value]));
  // MET = 8*2*30 + 3.3*3*20 = 678 -> 40 + (78/2400)*40 = 41.3 -> 41
  assert.equal(byLabel["Activity"], 41);
  // BMI 60/1.7^2 = 20.8 -> ideal band
  assert.equal(byLabel["Body composition"], 100);
  // Sleep: duration 8h -> 100; quality 100 - 4*5 = 80 -> 90
  assert.equal(byLabel["Sleep"], 90);
  // Nutrition: 5 portions + 2.5L -> 100
  assert.equal(byLabel["Nutrition"], 100);
});

test("body composition is omitted (not faked at 50) when weight/height missing", () => {
  const d = getAspectDetail(makeState({ profile: { weight: 0, height: 0 } }), "physical");
  const labels = d.components.map(c => c.label);
  assert.ok(!labels.includes("Body composition"), "no fabricated BMI row without measurements");
  // The rest of the physical breakdown is unaffected and still valid.
  assert.ok(d.components.length > 0);
  d.components.forEach(c => assert.ok(c.value >= 0 && c.value <= 100));
});

test("mental components convert raw WHO-5 and ST-5 correctly", () => {
  const d = getAspectDetail(makeState(), "mental");
  const byLabel = Object.fromEntries(d.components.map(c => [c.label, c.value]));
  assert.equal(byLabel["Well-being (WHO-5)"], 68); // 17*4
  assert.equal(byLabel["Stress resilience (ST-5)"], 70); // 100 - 3*10
});

test("RAS component appears only for coupled users with RAS data", () => {
  const single = getAspectDetail(makeState(), "relationships");
  assert.ok(!single.components.some(c => c.label.startsWith("Romantic")));
  const coupled = getAspectDetail(makeState({
    profile: { relationshipStatus: "Coupled" },
    baseline: { ...BASELINE, ras: 12 }
  }), "relationships");
  const ras = coupled.components.find(c => c.label.startsWith("Romantic"));
  assert.ok(ras, "coupled + RAS data adds the romantic component");
  assert.equal(ras.value, 75); // (12-3)/12*100
});

test("humanity future long-term security is binary on investments", () => {
  const withInv = getAspectDetail(makeState(), "humanityFuture");
  assert.equal(withInv.components.find(c => c.label === "Long-term security").value, 100);
  const without = getAspectDetail(makeState({ profile: { longTermInvestments: false } }), "humanityFuture");
  assert.equal(without.components.find(c => c.label === "Long-term security").value, 0);
});

test("finance components include the benchmark-based income standing", () => {
  const d = getAspectDetail(makeState(), "finance");
  const income = d.components.find(c => c.label === "Income standing");
  assert.ok(income && income.value >= 1 && income.value <= 99);
  const savings = d.components.find(c => c.label === "Savings habit");
  assert.equal(savings.value, 50); // 10% of the 20% target
});
