// Tests for population benchmark percentiles (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { normalCdf, ordinal, getAllBenchmarks, collectSources, percentileRange, percentileBand } from "../benchmarks.js";
import { GameStateManager } from "../state.js";

function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => installMockStorage());

const ALL_ASPECTS = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

const PROFILE = {
  income: 15000,
  region: "Provinces",
  gender: "male",
  weight: 60,
  height: 170,
  weeklyVigorousDays: 0,
  weeklyVigorousMins: 0,
  weeklyModerateDays: 0,
  weeklyModerateMins: 0,
  weeklyWalkingDays: 3,
  weeklyWalkingMins: 20,
  monthlyDonations: 100,
  volunteeringHours: 0,
  singleUsePlastics: 3,
  longTermInvestments: false
};

const BASELINE = {
  date: "2026-07-03T00:00:00.000Z",
  who5: 17, // 68/100, right at the published mean
  st5: 3,
  lsns: 17,
  ucla: 4,
  gse: 18, // per-item 3.0 vs norm 2.955
  grit: 14
};

function makeState(profileOverrides = {}, baseline = BASELINE) {
  return { profile: { ...PROFILE, ...profileOverrides }, baseline };
}

// --- MATH HELPERS ---

test("normalCdf is 0.5 at the mean and monotonically increasing", () => {
  assert.ok(Math.abs(normalCdf(67.56, 67.56, 22.96) - 0.5) < 1e-6);
  assert.ok(normalCdf(90, 67.56, 22.96) > normalCdf(50, 67.56, 22.96));
  assert.ok(normalCdf(-100, 0, 1) < 0.001 && normalCdf(100, 0, 1) > 0.999);
});

test("normalCdf is symmetric around the mean", () => {
  const below = normalCdf(-1.5, 0, 1);
  const above = normalCdf(1.5, 0, 1);
  assert.ok(Math.abs(below + above - 1) < 1e-6);
});

test("ordinal renders English suffixes including the 11-13 exceptions", () => {
  assert.equal(ordinal(1), "1st");
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(11), "11th");
  assert.equal(ordinal(13), "13th");
  assert.equal(ordinal(21), "21st");
  assert.equal(ordinal(99), "99th");
});

// --- STRUCTURE ---

test("getAllBenchmarks returns an entry per aspect with percentile, method, sources", () => {
  const all = getAllBenchmarks(makeState());
  assert.deepEqual(Object.keys(all).sort(), [...ALL_ASPECTS].sort());
  for (const key of ALL_ASPECTS) {
    const b = all[key];
    assert.ok(b, `${key} should be computable with a full baseline`);
    assert.ok(b.percentile >= 1 && b.percentile <= 99, `${key} percentile in 1-99`);
    assert.ok(["distribution", "threshold", "estimate"].includes(b.method));
    assert.ok(Array.isArray(b.sources) && b.sources.length > 0, `${key} must cite sources`);
    b.sources.forEach(src => assert.match(src.url, /^https:\/\//));
  }
});

test("survey-based aspects return null without a stored baseline (pre-benchmark saves)", () => {
  const all = getAllBenchmarks(makeState({}, null));
  assert.equal(all.mental, null);
  assert.equal(all.relationships, null);
  assert.equal(all.personalGoals, null);
  assert.ok(all.finance && all.physical && all.socialContribution && all.environment && all.humanityFuture);
});

test("collectSources dedupes by URL", () => {
  const sources = collectSources(getAllBenchmarks(makeState()));
  const urls = sources.map(s => s.url);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(urls.length >= 8, "a full benchmark set cites many distinct sources");
});

// --- FINANCE ---

test("finance percentile rises with income and adjusts for Bangkok", () => {
  const poor = getAllBenchmarks(makeState({ income: 6000 })).finance;
  const median = getAllBenchmarks(makeState({ income: 12900 })).finance;
  const rich = getAllBenchmarks(makeState({ income: 80000 })).finance;
  assert.ok(poor.percentile < median.percentile && median.percentile < rich.percentile);
  assert.ok(Math.abs(median.percentile - 50) <= 2, "median income sits near the 50th percentile");

  const bkk = getAllBenchmarks(makeState({ income: 15000, region: "Bangkok" })).finance;
  const prov = getAllBenchmarks(makeState({ income: 15000, region: "Provinces" })).finance;
  assert.ok(bkk.percentile < prov.percentile, "same income ranks lower against Bangkok earnings");

  assert.equal(getAllBenchmarks(makeState({ income: 0 })).finance.percentile, 1);
});

// --- PHYSICAL ---

test("physical percentile anchors the WHO guideline at ~29 and grows with MET-minutes", () => {
  const sedentary = getAllBenchmarks(makeState({ weeklyWalkingDays: 0, weeklyWalkingMins: 0 })).physical;
  assert.equal(sedentary.percentile, 1);

  // 3 x 61 min walking ~ 604 MET-min, just over the guideline
  const atGuideline = getAllBenchmarks(makeState({ weeklyWalkingDays: 3, weeklyWalkingMins: 61 })).physical;
  assert.ok(Math.abs(atGuideline.percentile - 29) <= 1, "guideline = ~29th percentile (71% of Thais meet it)");

  const athlete = getAllBenchmarks(makeState({ weeklyVigorousDays: 6, weeklyVigorousMins: 120 })).physical;
  assert.ok(athlete.percentile > 80);
});

test("physical benchmark includes a gender-specific BMI note", () => {
  const male = getAllBenchmarks(makeState({ gender: "male" })).physical;
  assert.ok(male.notes.some(n => n.includes("32.9%")), "male BMI note uses the male prevalence");
  const unspecified = getAllBenchmarks(makeState({ gender: "unspecified" })).physical;
  assert.ok(unspecified.notes.some(n => n.includes("37.5%")), "unspecified falls back to combined prevalence");
});

// --- MENTAL / RELATIONSHIPS / PERSONAL GOALS ---

test("mental percentile tracks WHO-5 and flags the ST-5 stress band", () => {
  const atMean = getAllBenchmarks(makeState({}, { ...BASELINE, who5: 17 })).mental;
  assert.ok(Math.abs(atMean.percentile - 50) <= 2, "WHO-5 68/100 is right at the norm mean");
  const flourishing = getAllBenchmarks(makeState({}, { ...BASELINE, who5: 25 })).mental;
  const struggling = getAllBenchmarks(makeState({}, { ...BASELINE, who5: 5 })).mental;
  assert.ok(flourishing.percentile > atMean.percentile && struggling.percentile < atMean.percentile);

  const stressed = getAllBenchmarks(makeState({}, { ...BASELINE, st5: 9 })).mental;
  assert.ok(stressed.notes.some(n => n.includes("stress problem")));
});

test("relationships percentile falls with loneliness and flags LSNS isolation risk", () => {
  const connected = getAllBenchmarks(makeState({}, { ...BASELINE, ucla: 3, lsns: 25 })).relationships;
  const lonely = getAllBenchmarks(makeState({}, { ...BASELINE, ucla: 9, lsns: 8 })).relationships;
  assert.ok(connected.percentile > lonely.percentile);
  assert.ok(lonely.notes.some(n => n.includes("under the social-isolation cutoff")));
});

test("personal goals percentile tracks GSE per-item score against the 25-country norm", () => {
  const atNorm = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18 })).personalGoals; // 3.0/item vs 2.955
  assert.ok(Math.abs(atNorm.percentile - 53) <= 3);
  const high = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 24 })).personalGoals;
  const low = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 6 })).personalGoals;
  assert.ok(low.percentile < atNorm.percentile && atNorm.percentile < high.percentile);
});

// --- PARTICIPATION-BAND ASPECTS ---

test("social contribution bands follow CAF participation rates", () => {
  const neither = getAllBenchmarks(makeState({ monthlyDonations: 0, volunteeringHours: 0 })).socialContribution;
  const donor = getAllBenchmarks(makeState({ monthlyDonations: 200, volunteeringHours: 0 })).socialContribution;
  const volunteer = getAllBenchmarks(makeState({ monthlyDonations: 0, volunteeringHours: 2 })).socialContribution;
  const both = getAllBenchmarks(makeState({ monthlyDonations: 200, volunteeringHours: 2 })).socialContribution;
  assert.ok(neither.percentile < donor.percentile);
  assert.ok(donor.percentile < volunteer.percentile);
  assert.ok(volunteer.percentile < both.percentile);
});

test("environment percentile puts the ~3/day Thai average at the 50th", () => {
  assert.equal(getAllBenchmarks(makeState({ singleUsePlastics: 3 })).environment.percentile, 50);
  assert.equal(getAllBenchmarks(makeState({ singleUsePlastics: 0 })).environment.percentile, 90);
  assert.equal(getAllBenchmarks(makeState({ singleUsePlastics: 12 })).environment.percentile, 10);
});

test("humanity future benchmark hinges on long-term investments", () => {
  const invested = getAllBenchmarks(makeState({ longTermInvestments: true })).humanityFuture;
  const not = getAllBenchmarks(makeState({ longTermInvestments: false })).humanityFuture;
  assert.ok(invested.percentile > not.percentile);
});

// --- STATE INTEGRATION ---

const SURVEY_DATA = {
  name: "Tester",
  age: "27",
  gender: "male",
  region: "Provinces",
  employment: "Office Worker",
  relationshipStatus: "Single",
  income: "15000",
  savingsRate: "10",
  digitalLiteracy: "60",
  weeklyLearningHours: "3",
  weeklyVigorousDays: "2",
  weeklyVigorousMins: "30",
  weeklyModerateDays: "0",
  weeklyModerateMins: "0",
  weeklyWalkingDays: "3",
  weeklyWalkingMins: "20",
  weight: "60",
  height: "170",
  sleepHours: "7",
  vegetablePortions: "2",
  waterLiters: "1.5",
  singleUsePlastics: "3",
  monthlyDonations: "100",
  volunteeringHours: "0",
  longTermInvestments: "false",
  cfpb: [2, 2, 2, 2, 2],
  jss: [1, 1, 1, 1],
  st5: [1, 0, 1, 0, 1],
  who5: [3, 4, 3, 4, 3],
  lsns: [3, 3, 3, 2, 3, 3],
  ucla: [1, 2, 1],
  ras: [4, 4, 4],
  gse: [3, 3, 3, 3, 3, 3],
  grit: [4, 3, 4, 3],
  ptm: [2, 2, 2, 2, 2],
  geb: [2, 2, 2, 2, 2, 2],
  lfis: [2, 2, 2, 2, 2]
};

test("submitOnboarding stores raw instrument sums as the benchmark baseline", () => {
  const m = new GameStateManager();
  m.submitOnboarding(structuredClone(SURVEY_DATA));
  const b = m.state.baseline;
  assert.ok(b && b.date);
  assert.equal(b.who5, 17);
  assert.equal(b.st5, 3);
  assert.equal(b.lsns, 17);
  assert.equal(b.ucla, 4);
  assert.equal(b.gse, 18);
  assert.equal(b.grit, 14);
  assert.equal(b.ras, null, "RAS is null for singles");

  const all = getAllBenchmarks(m.state);
  for (const key of ALL_ASPECTS) {
    assert.ok(all[key], `${key} benchmark computable after onboarding`);
  }
});

test("baseline survives save/reload and export/import", () => {
  const m = new GameStateManager();
  m.submitOnboarding(structuredClone(SURVEY_DATA));

  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.baseline.who5, 17, "baseline persists through localStorage reload");

  const exported = m.exportState();
  installMockStorage();
  const fresh = new GameStateManager();
  fresh.importState(exported);
  assert.equal(fresh.state.baseline.gse, 18, "baseline persists through export/import");
});

// --- PERCENTILE RANGES (Phase 3c) ---

test("percentileRange widens by method and clamps to 1-99", () => {
  // distribution (real mean/SD) is tightest; threshold (band placement) widest
  assert.deepEqual(percentileRange(50, "distribution"), { low: 44, high: 56 });
  assert.deepEqual(percentileRange(50, "estimate"), { low: 40, high: 60 });
  assert.deepEqual(percentileRange(50, "threshold"), { low: 38, high: 62 });
  // never leaves the 1-99 band at the extremes
  assert.deepEqual(percentileRange(3, "estimate"), { low: 1, high: 13 });
  assert.deepEqual(percentileRange(97, "estimate"), { low: 87, high: 99 });
  // an unknown method falls back to the medium margin of 10
  assert.deepEqual(percentileRange(50, "mystery"), { low: 40, high: 60 });
});

test("getAllBenchmarks attaches a range that brackets each percentile", () => {
  const all = getAllBenchmarks(makeState());
  for (const key of ALL_ASPECTS) {
    const b = all[key];
    assert.ok(b.range, `${key} carries a range`);
    assert.ok(b.range.low >= 1 && b.range.high <= 99, `${key} range stays within 1-99`);
    assert.ok(b.range.low <= b.percentile && b.percentile <= b.range.high, `${key} range brackets its percentile`);
  }
});

test("null benchmarks carry no range (pre-baseline saves)", () => {
  const all = getAllBenchmarks(makeState({}, null));
  assert.equal(all.mental, null, "survey-only aspects stay null, not a ranged object");
});

// --- DEEP ASSESSMENT + FRIENDLIER PERCENTILES ---

test("percentileRange tightens (roughly halves) for deep-verified aspects", () => {
  assert.deepEqual(percentileRange(50, "distribution", true), { low: 47, high: 53 });
  assert.deepEqual(percentileRange(50, "estimate", true), { low: 45, high: 55 });
  assert.deepEqual(percentileRange(50, "threshold", true), { low: 42, high: 58 });
  const short = percentileRange(50, "estimate");
  const deep = percentileRange(50, "estimate", true);
  assert.ok((deep.high - deep.low) < (short.high - short.low), "verified band is narrower");
});

test("percentileBand maps a percentile to a plain-language band", () => {
  assert.equal(percentileBand(95).key, "top10");
  assert.equal(percentileBand(90).key, "top10");
  assert.equal(percentileBand(80).key, "top25");
  assert.equal(percentileBand(65).key, "above");
  assert.equal(percentileBand(50).key, "around");
  assert.equal(percentileBand(30).key, "below");
  assert.equal(percentileBand(10).key, "bottom");
});

test("a deep-verified aspect gets a narrower band and a verified flag", () => {
  const plain = getAllBenchmarks(makeState()).personalGoals;
  const verifiedBaseline = { ...BASELINE, deep: { gse10: 30 }, deepDone: { personalGoals: true } };
  const deep = getAllBenchmarks(makeState({}, verifiedBaseline)).personalGoals;
  assert.equal(deep.verified, true);
  assert.ok(!plain.verified);
  assert.ok((deep.range.high - deep.range.low) < (plain.range.high - plain.range.low));
});

test("the full GSE-10 makes the personal-goals benchmark an exact distribution match", () => {
  const shortForm = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18 })).personalGoals;
  assert.equal(shortForm.method, "estimate");
  // GSE-10 raw 30 -> per-item 3.0, same reading as the short form but now exact.
  const deep = getAllBenchmarks(makeState({}, { ...BASELINE, deep: { gse10: 30 }, deepDone: { personalGoals: true } })).personalGoals;
  assert.equal(deep.method, "distribution");
  assert.ok(deep.notes.some(n => n.includes("direct match")));
});

test("grit note discloses the perseverance-only short form and prefers the full 12-item scale (#8)", () => {
  const shortForm = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18, grit: 14 })).personalGoals;
  assert.ok(
    shortForm.notes.some(n => /perseverance facet only/i.test(n)),
    "onboarding grit is disclosed as the perseverance facet only"
  );
  const deep = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18, grit: 14, deep: { grit12: 48 } })).personalGoals;
  assert.ok(
    deep.notes.some(n => /full 12-item/i.test(n)),
    "with the deep Grit-12 present the note cites the full 12-item scale"
  );
});
