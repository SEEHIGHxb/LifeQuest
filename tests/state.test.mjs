// Tests for GameStateManager game logic and the pure scoring module (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";
import {
  calculateFinanceScore,
  calculatePhysicalScore,
  calculateMentalScore,
  calculateRelationshipsScore,
  calculateSocialContributionScore,
  calculateEnvironmentScore
} from "../scoring.js";
import { getAspectConfidence, isAspectDeepVerified } from "../aspects.js";
import { INSTRUMENTS } from "../surveys.js";

// Minimal localStorage mock so the manager can be constructed in Node
function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => installMockStorage());

const NEUTRAL_PROFILE = {
  income: 15000,
  region: "Provinces",
  savingsRate: 10,
  relationshipStatus: "Single",
  weight: 60,
  height: 170,
  sleepHours: 7,
  vegetablePortions: 2,
  waterLiters: 1.5,
  weeklyVigorousDays: 0,
  weeklyVigorousMins: 0,
  weeklyModerateDays: 0,
  weeklyModerateMins: 0,
  weeklyWalkingDays: 3,
  weeklyWalkingMins: 20,
  weeklyLearningHours: 2,
  digitalLiteracy: 50,
  monthlyDonations: 100,
  volunteeringHours: 0,
  singleUsePlastics: 5,
  longTermInvestments: false
};

test("finance score combines income percentile, CFPB, and savings bonus", () => {
  const low = calculateFinanceScore({ ...NEUTRAL_PROFILE, income: 5000, savingsRate: 0 }, [0, 0, 0, 0, 0]);
  const high = calculateFinanceScore({ ...NEUTRAL_PROFILE, income: 80000, savingsRate: 30 }, [4, 4, 4, 4, 4]);
  assert.ok(low < high, "higher income + well-being must score higher");
  assert.ok(high <= 100 && low >= 0, "score stays in 0-100");
});

test("physical score rewards activity (regression: activity data must not be zeroed)", () => {
  const sedentary = calculatePhysicalScore(
    { ...NEUTRAL_PROFILE, weeklyWalkingDays: 0, weeklyWalkingMins: 0 }, [0, 0, 0, 0]);
  const active = calculatePhysicalScore(
    { ...NEUTRAL_PROFILE, weeklyVigorousDays: 4, weeklyVigorousMins: 45 }, [0, 0, 0, 0]);
  assert.ok(active > sedentary, "active profile must outscore sedentary");
});

test("environment transit component uses GEB Q3 instead of hardcoded 100", () => {
  const noTransit = calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 0, 2, 2, 2]);
  const fullTransit = calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 4, 2, 2, 2]);
  assert.equal(fullTransit - noTransit, 40, "transit is 40% of the environment score");
});

test("relationships score includes RAS only when coupled", () => {
  const single = calculateRelationshipsScore(
    { ...NEUTRAL_PROFILE, relationshipStatus: "Single" }, [3, 3, 3, 3, 3, 3], [1, 1, 1], [5, 5, 5]);
  const coupled = calculateRelationshipsScore(
    { ...NEUTRAL_PROFILE, relationshipStatus: "Coupled" }, [3, 3, 3, 3, 3, 3], [1, 1, 1], [5, 5, 5]);
  assert.ok(single > 0 && coupled > 0);
  assert.notEqual(single, coupled);
});

// --- SCORING INTEGRITY (findings #5, #6, #7) ---

test("skipped ST-5 / UCLA default to a neutral midpoint, not the healthiest extreme (#5)", () => {
  const defOf = key => INSTRUMENTS[key].items.map(it => it.def);
  // ST-5 at its skip-default now reads a neutral 50 stress-resilience: with
  // WHO-5 forced to 0, mental = 0.5*0 + 0.5*50 = 25 (was 50 when ST-5 defaulted
  // to the calmest option and read as 100).
  assert.equal(calculateMentalScore({}, defOf("st5"), [0, 0, 0, 0, 0]), 25);
  // UCLA at its skip-default now reads a neutral 50 low-loneliness: with LSNS at
  // 0, relationships = 0.5*0 + 0.5*50 = 25 (was 50 when UCLA defaulted to least
  // lonely and read as 100).
  const single = { relationshipStatus: "Single" };
  assert.equal(calculateRelationshipsScore(single, [0, 0, 0, 0, 0, 0], defOf("ucla"), null), 25);
});

test("social contribution now scores the previously-ignored PTM 'help friends/family' item (#6)", () => {
  const low = calculateSocialContributionScore(NEUTRAL_PROFILE, [2, 0, 2, 2, 3]); // Q2 = 0
  const high = calculateSocialContributionScore(NEUTRAL_PROFILE, [2, 4, 2, 2, 3]); // Q2 = 4
  assert.ok(high > low, "raising PTM Q2 must raise the score now that it counts");
});

test("environment now scores the previously-ignored GEB avoidance (Q2) and eco-product (Q6) items (#6)", () => {
  const q2low = calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 0, 2, 2, 2, 2]);
  const q2high = calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 4, 2, 2, 2, 2]);
  assert.ok(q2high > q2low, "GEB Q2 (single-use avoidance) now counts");
  const q6low = calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 2, 2, 2, 0]);
  const q6high = calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 2, 2, 2, 4]);
  assert.ok(q6high > q6low, "GEB Q6 (eco-products) now counts");
});

test("physical omits BMI (no fabricated 50) and renormalizes when weight/height are missing (#7)", () => {
  // All measurable components are perfect; only weight/height are absent.
  const perfectNoBody = {
    weeklyVigorousDays: 7, weeklyVigorousMins: 120, // MET 6720 -> activity 100
    weeklyModerateDays: 0, weeklyModerateMins: 0,
    weeklyWalkingDays: 0, weeklyWalkingMins: 0,
    weight: 0, height: 0, // missing measurements -> BMI omitted
    sleepHours: 8, // duration 100
    vegetablePortions: 5, waterLiters: 2.5 // nutrition 100
  };
  // Renormalized over the surviving parts (all 100) -> 100. The old code blended
  // a fake S_bmi = 50 and returned 90.
  assert.equal(calculatePhysicalScore(perfectNoBody, [0, 0, 0, 0]), 100);
});

test("physical still includes body composition when weight/height are present (#7)", () => {
  const ideal = { ...NEUTRAL_PROFILE, weight: 60, height: 170 }; // BMI ~20.8 -> 100
  const obese = { ...NEUTRAL_PROFILE, weight: 100, height: 160 }; // BMI ~39 -> 25
  assert.ok(
    calculatePhysicalScore(ideal, [0, 0, 0, 0]) > calculatePhysicalScore(obese, [0, 0, 0, 0]),
    "measured body composition still moves the score"
  );
});

test("XP never moves the level — only birthdays do", () => {
  const m = new GameStateManager();
  m.state.profile.level = 34;
  const before = m.state.profile.level;
  // 350 would have cleared three levels under the old xp >= level*100 ladder.
  // Level is the user's age now, so no amount of XP may touch it: a Level that
  // climbs with app usage is a fact about the app, not about the person.
  m.addXP(350);
  assert.equal(m.state.profile.level, before, "grinding XP must not age the user");
  assert.equal(m.state.profile.season.earnedXp, 350, "XP lands in the season instead");
  assert.equal(m.state.profile.lifetimeXp, 350, "and still counts toward the lifetime total");
});

test("addPledge validates the template, clamps the target, and blocks duplicates", () => {
  const m = new GameStateManager();
  const added = m.addPledge("water", 99);
  assert.equal(added.ok, true);
  assert.equal(added.pledge.target, 5, "target clamped into the template bounds");
  assert.match(added.pledge.id, /^goal_/);
  assert.equal(m.addPledge("water", 2).ok, false, "one pledge per metric");
  assert.equal(m.addPledge("notATemplate", 2).ok, false, "unknown templates rejected");
});

test("the pledge list is capped at 6", () => {
  const m = new GameStateManager();
  for (const id of ["water", "sleep", "veg", "exerciseDays", "metMinutes", "learning"]) {
    assert.equal(m.addPledge(id).ok, true, `${id} added`);
  }
  const seventh = m.addPledge("plastics", 2);
  assert.equal(seventh.ok, false);
  assert.match(seventh.reason, /full/i);
});

test("removePledge and updatePledgeTarget operate by pledge id", () => {
  const m = new GameStateManager();
  const { pledge } = m.addPledge("plastics", 2);
  assert.equal(m.updatePledgeTarget(pledge.id, 999).target, 10, "update clamps to the template bounds");
  assert.equal(m.updatePledgeTarget("no-such-id", 3), null);
  m.removePledge(pledge.id);
  assert.equal(m.state.goals.length, 0);
});

test("same-schema saves merge over defaults (field backfill)", () => {
  installMockStorage({
    lifequest_state: JSON.stringify({
      schemaVersion: 4,
      onboarded: true,
      profile: { name: "OldUser", level: 4, xp: 20 },
      aspects: { finance: 55 },
      history: [],
      goals: []
    })
  });
  const m = new GameStateManager();
  assert.equal(m.state.profile.name, "OldUser");
  assert.equal(m.state.profile.level, 4);
  assert.equal(m.state.aspects.finance, 55);
  assert.equal(m.state.aspects.physical, 0, "missing aspects default to 0");
  assert.deepEqual(m.state.reviews, [], "new fields are backfilled");
  assert.equal(m.state.profile.digitalLiteracy, 50, "new profile fields backfilled");
});

test("pre-v3 saves trigger a fresh start (measurement model changed)", () => {
  installMockStorage({
    lifequest_state: JSON.stringify({
      schemaVersion: 2,
      onboarded: true,
      profile: { name: "V2User", level: 9 },
      aspects: { finance: 70 }
    })
  });
  const m = new GameStateManager();
  assert.equal(m.state.onboarded, false, "old schema requires re-onboarding");
  assert.equal(m.state.profile.name, "Guest");
});

test("weekly snapshots: one at onboarding, none again within 7 days, one after", () => {
  const m = new GameStateManager();
  m.state.onboarded = true;
  assert.equal(m.maybeTakeSnapshot(), true, "first snapshot taken");
  assert.equal(m.maybeTakeSnapshot(), false, "no duplicate within the interval");
  m.state.snapshots[0].date = new Date(Date.now() - 8 * 86400000).toISOString();
  assert.equal(m.maybeTakeSnapshot(), true, "snapshot taken after 7 days");
  assert.equal(m.state.snapshots.length, 2);
  assert.ok(m.state.snapshots[1].aspects, "snapshot carries aspect values");
});

test("export/import round-trips full state", () => {
  const m = new GameStateManager();
  m.state.onboarded = true;
  m.state.profile.name = "Backup User";
  m.state.goals = [{
    id: "goal_abc123", templateId: "water", target: 2.5, streak: 3,
    lastResult: { week: "2026-W28", value: 2.6, met: true }
  }];
  m.state.reviews.push({
    date: new Date().toISOString(), week: "2026-W28",
    inputs: { waterLiters: 2.6 }, shifts: { physical: 2 }, goals: [], xp: 85
  });
  const backup = m.exportState();

  installMockStorage();
  const restored = new GameStateManager();
  restored.importState(backup);
  assert.equal(restored.state.profile.name, "Backup User");
  assert.equal(restored.state.onboarded, true);
  assert.equal(restored.state.goals[0].streak, 3, "pledge streak survives the round-trip");
  assert.equal(restored.state.goals[0].lastResult.met, true);
  assert.equal(restored.state.reviews[0].xp, 85, "review history survives the round-trip");
  assert.equal(restored.state.reviews[0].inputs.waterLiters, 2.6);
});

test("importState rejects invalid or incompatible backups", () => {
  const m = new GameStateManager();
  assert.throws(() => m.importState("{not json"), /not valid JSON/);
  assert.throws(() => m.importState('{"foo": 1}'), /not a valid backup/);
  assert.throws(
    () => m.importState(JSON.stringify({ schemaVersion: 2, profile: {}, aspects: {} })),
    /schema v2/
  );
});

// --- DURABILITY & SECURITY (findings #1, #2, #3) ---

test("saveState reports failure instead of swallowing it; a review flags a non-persisted write (#1)", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  m.state.baseline.date = new Date(Date.now() - 8 * 86400000).toISOString(); // review due
  // Simulate a full quota / Safari Private Mode: every write throws.
  globalThis.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.equal(m.saveState(), false, "saveState returns false when the write is rejected");
  const result = m.submitWeeklyReview({ waterLiters: 2 });
  assert.ok(result, "the review itself still completes");
  assert.equal(result.persisted, false, "submitWeeklyReview reports that the write did not persist");
});

test("a corrupt save is preserved for recovery, never silently overwritten (#2)", () => {
  installMockStorage({ lifequest_state: "{not json" });
  const m = new GameStateManager();
  assert.equal(m.state.onboarded, false, "corrupt save falls back to a fresh state");
  assert.equal(m.hasRecoverableSave(), true, "the unreadable save is kept");
  assert.equal(m.getRecoverableSave(), "{not json", "raw bytes are recoverable verbatim");
  m.saveState(); // a later good save must NOT clobber the preserved copy
  assert.equal(m.getRecoverableSave(), "{not json", "recovery copy survives subsequent saves");
  m.clearRecoverableSave();
  assert.equal(m.hasRecoverableSave(), false, "recovery copy can be cleared once rescued");
});

test("an incompatible-schema save is preserved for recovery rather than discarded (#2)", () => {
  installMockStorage({
    lifequest_state: JSON.stringify({
      schemaVersion: 2, onboarded: true,
      profile: { name: "V2User", level: 9 }, aspects: { finance: 70 }
    })
  });
  const m = new GameStateManager();
  assert.equal(m.state.onboarded, false, "old schema requires re-onboarding");
  assert.equal(m.hasRecoverableSave(), true, "old data kept instead of overwritten");
  assert.equal(JSON.parse(m.getRecoverableSave()).profile.name, "V2User", "old profile stays recoverable");
});

test("importing hostile fields is coerced to safe shapes (#3 XSS hardening)", () => {
  const m = new GameStateManager();
  const hostile = {
    schemaVersion: 4,
    profile: { name: "<img src=x onerror=alert(1)>", level: "<script>", xp: "abc" },
    aspects: { finance: 55, "<img onerror=alert(1)>": 90, physical: 999 },
    friends: [{ id: '"><script>', name: "Mallory", level: "<x>", totalPoints: "NaN", aspects: {} }],
    goals: [{ id: '"><img>', templateId: "<script>alert(1)</script>", target: 2 }]
  };
  m.importState(JSON.stringify(hostile));
  const s = m.state;
  // Aspects: only the eight known keys survive, each clamped to 0-100.
  assert.equal(Object.keys(s.aspects).length, 8);
  assert.equal(s.aspects["<img onerror=alert(1)>"], undefined, "injected aspect key dropped");
  assert.equal(s.aspects.physical, 100, "out-of-range aspect clamped");
  // Profile scalars coerced to safe shapes.
  assert.equal(typeof s.profile.level, "number");
  assert.equal(s.profile.xp, undefined, "the retired v4 xp field does not survive import");
  assert.equal(s.profile.season.earnedXp, 0, "non-numeric season XP coerced to 0");
  // Friend id reduced to a safe token; level/points are no longer carried at all
  // — v2 comparison codes hold only a name and the eight aspect scores.
  assert.match(s.friends[0].id, /^[A-Za-z0-9_-]+$/, "friend id stripped to a safe token");
  assert.equal(s.friends[0].level, undefined, "no level survives the import");
  assert.equal(s.friends[0].totalPoints, undefined, "no point total survives the import");
  // A pledge whose templateId names no real template is dropped whole — every
  // user-facing pledge string derives from its template, so there is nothing
  // safe to render an unknown one as.
  assert.equal(s.goals.length, 0, "pledge with a hostile templateId rejected");
});

test("submitOnboarding stores clamped age and validated gender", () => {
  const m = new GameStateManager();
  const survey = {
    name: "Demo", age: "200", gender: "female", region: "Bangkok",
    employment: "Student", relationshipStatus: "Single",
    income: 20000, savingsRate: 10, height: 170, weight: 60, sleepHours: 7,
    vegetablePortions: 2, waterLiters: 1.5, weeklyVigorousDays: 0, weeklyVigorousMins: 0,
    weeklyModerateDays: 0, weeklyModerateMins: 0, weeklyWalkingDays: 3, weeklyWalkingMins: 20,
    weeklyLearningHours: 2, digitalLiteracy: 50, monthlyDonations: 0, volunteeringHours: 0,
    singleUsePlastics: 5, longTermInvestments: "false",
    cfpb: [2, 2, 2, 2, 2], jss: [0, 0, 0, 0], st5: [0, 0, 0, 0, 0], who5: [3, 3, 3, 3, 3],
    lsns: [3, 3, 3, 3, 3, 3], ucla: [1, 1, 1], ras: [3, 3, 3], gse: [3, 3, 3, 3, 3, 3],
    grit: [4, 3, 4, 4], ptm: [2, 1, 2, 2, 3], geb: [2, 2, 3, 3, 2, 2], lfis: [3, 2, 2, 3, 2]
  };
  m.submitOnboarding(survey);
  assert.equal(m.state.profile.age, 100, "age clamped to 15-100");
  assert.equal(m.state.profile.gender, "female");
  assert.equal(m.state.snapshots.length, 1, "baseline snapshot taken at onboarding");
});

const MINIMAL_SURVEY = {
  name: "Cov", age: "30", gender: "male", region: "Bangkok",
  employment: "Student", relationshipStatus: "Single",
  income: 20000, savingsRate: 10, height: 170, weight: 60, sleepHours: 7,
  vegetablePortions: 2, waterLiters: 1.5, weeklyVigorousDays: 0, weeklyVigorousMins: 0,
  weeklyModerateDays: 0, weeklyModerateMins: 0, weeklyWalkingDays: 3, weeklyWalkingMins: 20,
  weeklyLearningHours: 2, digitalLiteracy: 50, monthlyDonations: 0, volunteeringHours: 0,
  singleUsePlastics: 5, longTermInvestments: "false",
  cfpb: [2, 2, 2, 2, 2], jss: [0, 0, 0, 0], st5: [0, 0, 0, 0, 0], who5: [3, 3, 3, 3, 3],
  lsns: [3, 3, 3, 3, 3, 3], ucla: [1, 1, 1], ras: [3, 3, 3], gse: [3, 3, 3, 3, 3, 3],
  grit: [4, 3, 4, 4], ptm: [2, 1, 2, 2, 3], geb: [2, 2, 3, 3, 2, 2], lfis: [3, 2, 2, 3, 2]
};

test("submitOnboarding persists coverage flags when provided", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY, false, {
    provided: { income: true, weight: false },
    answered: { who5: true, st5: false }
  });
  assert.equal(m.state.profile.provided.income, true);
  assert.equal(m.state.profile.provided.weight, false);
  assert.equal(m.state.baseline.answered.who5, true);
  assert.equal(m.state.baseline.answered.st5, false);
});

test("submitOnboarding without coverage leaves flags absent (unknown)", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  assert.equal(m.state.profile.provided, undefined, "no provided map when uncaptured");
  assert.equal("answered" in m.state.baseline, false, "no answered map when uncaptured");
});

test("coverage flags survive a save/load round-trip; absent stays absent", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY, false, {
    provided: { income: true }, answered: { who5: true }
  });
  // Reload from the same mock storage — merge must preserve the flags.
  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.profile.provided.income, true);
  assert.equal(reloaded.state.baseline.answered.who5, true);

  // A save made without coverage loads without the flags.
  installMockStorage();
  const bare = new GameStateManager();
  bare.submitOnboarding(MINIMAL_SURVEY);
  const bareReloaded = new GameStateManager();
  assert.equal(bareReloaded.state.profile.provided, undefined);
});

test("a re-assessment upgrades survey confidence from estimated to high (Phase 3c deepen)", () => {
  const m = new GameStateManager();
  // Express-style baseline: instruments captured but marked unanswered.
  m.submitOnboarding(MINIMAL_SURVEY, true, {
    provided: {},
    answered: { who5: false, st5: false, ucla: false, gse: false }
  });
  assert.equal(getAspectConfidence(m.state, "mental").tier, "estimated", "starts estimated");

  m.submitCheckin({
    who5: [4, 4, 4, 4, 4], st5: [0, 0, 0, 0, 0], ucla: [1, 1, 1], ras: null, gse: [4, 4, 4, 4, 4, 4]
  });

  // The re-asked instruments are now answered, so confidence upgrades.
  assert.equal(m.state.baseline.answered.who5, true);
  assert.equal(m.state.baseline.answered.st5, true);
  assert.equal(m.state.baseline.answered.ucla, true);
  assert.equal(m.state.baseline.answered.gse, true);
  assert.equal(getAspectConfidence(m.state, "mental").tier, "high", "who5 + st5 both answered");
});

// --- DEEP ASSESSMENT (Phase 4) ---

test("a deep-assessment section verifies an aspect and recalibrates its score", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  assert.ok(!isAspectDeepVerified(m.state, "personalGoals"));
  const before = m.state.aspects.personalGoals;

  // Full-length personal-goals section: max GSE-10, Grit-12, and self-esteem.
  const result = m.submitDeepAssessment("personalGoals", {
    gse10: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // raw 40 -> efficacy 100
    grit12: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], // raw 60 -> grit 100
    rses: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] // raw 30 -> esteem 100
  });

  assert.ok(result && typeof result.score === "number");
  assert.equal(m.state.baseline.deep.gse10, 40);
  assert.equal(m.state.baseline.deep.grit12, 60);
  assert.equal(m.state.baseline.deep.rses, 30);
  assert.equal(m.state.baseline.deepDone.personalGoals, true);
  assert.equal(m.state.baseline.deepAnswered.gse10, true);
  assert.equal(getAspectConfidence(m.state, "personalGoals").tier, "verified", "aspect now verified");
  assert.ok(isAspectDeepVerified(m.state, "personalGoals"));
  assert.ok(m.state.aspects.personalGoals >= before, "strong deep answers raise (or hold) the score");
  assert.ok(m.state.aspects.personalGoals <= 100);
});

test("deep assessment persists through reload and verifies only its own section", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  m.submitDeepAssessment("mental", { pss10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); // no stress
  assert.equal(m.state.baseline.deep.pss10, 0);

  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.baseline.deepDone.mental, true, "deep data survives localStorage reload");
  assert.equal(getAspectConfidence(reloaded.state, "mental").tier, "verified");
  assert.ok(!isAspectDeepVerified(reloaded.state, "finance"), "other aspects stay unverified");
});

// --- P7: imported goals, profile enums, and the backup nudge ---

test("importing a hostile pledge coerces it to a safe shape", () => {
  const m = new GameStateManager();
  m.importState(JSON.stringify({
    schemaVersion: 4,
    profile: {},
    aspects: {},
    goals: [{
      id: '"><script>',
      templateId: "water",
      target: "abc",
      streak: -5,
      lastResult: { week: "<img src=x onerror=alert(1)>", value: "1e99", met: "yes" }
    }]
  }));
  const g = m.state.goals[0];
  assert.equal(m.state.goals.length, 1);
  assert.match(g.id, /^[A-Za-z0-9_-]+$/, "pledge id stripped to a safe token");
  assert.equal(g.target, 2, "non-numeric target falls back to the template default");
  assert.equal(g.streak, 0, "negative streak clamped");
  assert.ok(g.lastResult.week.length <= 12, "lastResult week length-capped");
  assert.equal(g.lastResult.value, 1000000, "absurd value clamped");
  assert.equal(g.lastResult.met, false, "truthy-but-not-true met coerced to false");
});

test("pledges that cannot be rebuilt are dropped whole", () => {
  const m = new GameStateManager();
  m.importState(JSON.stringify({
    schemaVersion: 4,
    profile: {},
    aspects: {},
    goals: [
      null,
      "water",
      { id: "g1" }, // no templateId
      { id: "g2", templateId: "constructor", target: 2 }, // prototype-chain probe
      { id: "keeper", templateId: "sleep", target: 7 }
    ]
  }));
  assert.equal(m.state.goals.length, 1, "only the rebuildable pledge survives");
  assert.equal(m.state.goals[0].templateId, "sleep");
  assert.equal(m.state.goals[0].lastResult, null, "absent lastResult stays null");
});

test("importing unknown profile enums falls back to benchmark-selectable values", () => {
  const m = new GameStateManager();
  m.importState(JSON.stringify({
    schemaVersion: 3,
    aspects: {},
    profile: {
      gender: "<script>", region: "Atlantis", employment: "Pirate",
      relationshipStatus: "It's complicated",
      age: 9999, sleepHours: "abc", income: -5, longTermInvestments: "yes"
    }
  }));
  const p = m.state.profile;
  assert.equal(p.gender, "unspecified");
  assert.equal(p.region, "Provinces");
  assert.equal(p.employment, "Office Worker");
  assert.equal(p.relationshipStatus, "Single");
  assert.equal(p.age, 120, "out-of-range age clamped, not defaulted");
  assert.equal(p.sleepHours, 7, "non-numeric field falls back to the default");
  assert.equal(p.income, 0, "negative income clamped to the floor");
  assert.equal(p.longTermInvestments, false, "truthy string coerced to a real boolean");
});

test("backup nudge stays quiet until there is data worth losing", () => {
  const m = new GameStateManager();
  m.state.onboarded = true;
  assert.equal(m.daysSinceLastExport(), null, "never exported reports null");
  assert.equal(m.needsBackupNudge(), false, "no nudge with nothing recorded");

  // Two weekly reviews are the "worth losing" threshold.
  for (const week of ["2026-W27", "2026-W28"]) {
    m.state.reviews.push({ date: new Date().toISOString(), week, inputs: {}, shifts: {}, goals: [], xp: 60 });
  }
  assert.equal(m.needsBackupNudge(), true, "nudges once enough is recorded and never backed up");

  m.exportState();
  assert.equal(m.daysSinceLastExport(), 0);
  assert.equal(m.needsBackupNudge(), false, "exporting silences the nudge");

  // 31 days later the nudge returns.
  m.state.lastExportAt = new Date(Date.now() - 31 * 86400000).toISOString();
  assert.equal(m.daysSinceLastExport(), 31);
  assert.equal(m.needsBackupNudge(), true, "a stale backup nudges again");
});

test("a migrated legacy action archive alone also justifies the nudge", () => {
  const m = new GameStateManager();
  m.state.onboarded = true;
  m.state.history = Array.from({ length: 10 }, () => ({ timestamp: new Date().toISOString() }));
  assert.equal(m.needsBackupNudge(), true, "the pre-v4 archive is still worth backing up");
});

test("a garbage lastExportAt cannot masquerade as a recent backup", () => {
  const m = new GameStateManager();
  for (const bad of ["not-a-date", "", 12345, null, {}]) {
    m.importState(JSON.stringify({
      schemaVersion: 3, profile: {}, aspects: {}, lastExportAt: bad
    }));
    assert.equal(m.state.lastExportAt, null, `lastExportAt ${JSON.stringify(bad)} rejected`);
    assert.equal(m.daysSinceLastExport(), null);
  }
  // A future stamp reports 0 rather than a negative age.
  m.importState(JSON.stringify({
    schemaVersion: 3, profile: {}, aspects: {},
    lastExportAt: new Date(Date.now() + 86400000).toISOString()
  }));
  assert.equal(m.daysSinceLastExport(), 0, "future-dated stamp clamps to 0");
});

test("exportState stamps the backup with its own export time", () => {
  const m = new GameStateManager();
  const parsed = JSON.parse(m.exportState());
  assert.ok(parsed.lastExportAt, "the exported file records when it was exported");
  assert.equal(parsed.lastExportAt, m.state.lastExportAt, "stamp persisted, not just serialised");
});

test("submitDeepAssessment needs an onboarding baseline first", () => {
  const m = new GameStateManager();
  assert.equal(m.submitDeepAssessment("mental", { pss10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }), null);
});

test("corrupt saved state falls back to defaults", () => {
  installMockStorage({ lifequest_state: "{not json" });
  const m = new GameStateManager();
  assert.equal(m.state.onboarded, false);
  assert.equal(m.state.profile.name, "Guest");
});

test("the legacy action archive is capped at 500 entries on load", () => {
  // Nothing writes history anymore (it is a read-only pre-v4 archive), so the
  // cap is enforced where the data enters: the merge on load/import.
  const m = new GameStateManager();
  m.importState(JSON.stringify({
    schemaVersion: 4,
    profile: {},
    aspects: {},
    history: Array.from({ length: 510 }, (_, i) => ({ timestamp: `t${i}` }))
  }));
  assert.equal(m.state.history.length, 500);
});

// --- RESPONSE QUALITY (G3): straight-lined submissions are demoted ---
import { DEEP_INSTRUMENTS } from "../surveys.js";

// Answers that all sit at the FIRST option position (classic careless pattern).
const topPosition = instr => instr.items.map(it => it.options[0].v);

test("a straight-lined CFPB at onboarding is demoted to unanswered and flagged", () => {
  const m = new GameStateManager();
  // [0,0,0,4,0] is every item's FIRST radio: the reverse-keyed item 4 makes an
  // honest pattern land elsewhere, so this reads as careless.
  m.submitOnboarding({ ...MINIMAL_SURVEY, cfpb: topPosition(INSTRUMENTS.cfpb) }, false, {
    provided: {},
    answered: { cfpb: true, who5: true }
  });
  assert.equal(m.state.baseline.answered.cfpb, false, "flagged instrument no longer counts as answered");
  assert.equal(m.state.baseline.flagged.cfpb, true, "flag recorded for the UI prompt");
  assert.equal(m.state.baseline.answered.who5, true, "uniformly-keyed instruments are untouched");
});

test("a varied CFPB at onboarding keeps its answered flag and is not flagged", () => {
  const m = new GameStateManager();
  m.submitOnboarding({ ...MINIMAL_SURVEY, cfpb: [0, 1, 0, 0, 0] }, false, {
    provided: {},
    answered: { cfpb: true }
  });
  assert.equal(m.state.baseline.answered.cfpb, true);
  assert.ok(!(m.state.baseline.flagged && m.state.baseline.flagged.cfpb), "no flag on varied answers");
});

test("a straight-lined deep instrument never enters scoring and blocks verification", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  const before = m.state.aspects.mental;

  const result = m.submitDeepAssessment("mental", { pss10: topPosition(DEEP_INSTRUMENTS.pss10) });

  assert.equal(result.flagged, true, "caller told the submission was rejected");
  assert.equal(m.state.baseline.deep && m.state.baseline.deep.pss10, undefined, "careless data kept out of scoring");
  assert.ok(!isAspectDeepVerified(m.state, "mental"), "flagged section does not verify");
  assert.equal(m.state.baseline.deepFlagged.pss10, true);
  assert.equal(m.state.aspects.mental, before, "score unchanged by a rejected submission");
});

test("an honest deep retake clears the flag and verifies normally", () => {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  m.submitDeepAssessment("mental", { pss10: topPosition(DEEP_INSTRUMENTS.pss10) });
  assert.equal(m.state.baseline.deepFlagged.pss10, true);

  const result = m.submitDeepAssessment("mental", { pss10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });

  assert.equal(result.flagged, false);
  assert.ok(!(m.state.baseline.deepFlagged && m.state.baseline.deepFlagged.pss10), "flag cleared on honest retake");
  assert.equal(m.state.baseline.deep.pss10, 0);
  assert.ok(isAspectDeepVerified(m.state, "mental"));
});
