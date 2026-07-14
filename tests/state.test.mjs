// Tests for GameStateManager scoring and game logic (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";
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
  const m = new GameStateManager();
  const low = m.calculateFinanceScore({ ...NEUTRAL_PROFILE, income: 5000, savingsRate: 0 }, [0, 0, 0, 0, 0]);
  const high = m.calculateFinanceScore({ ...NEUTRAL_PROFILE, income: 80000, savingsRate: 30 }, [4, 4, 4, 4, 4]);
  assert.ok(low < high, "higher income + well-being must score higher");
  assert.ok(high <= 100 && low >= 0, "score stays in 0-100");
});

test("physical score rewards activity (regression: activity data must not be zeroed)", () => {
  const m = new GameStateManager();
  const sedentary = m.calculatePhysicalScore(
    { ...NEUTRAL_PROFILE, weeklyWalkingDays: 0, weeklyWalkingMins: 0 }, [0, 0, 0, 0]);
  const active = m.calculatePhysicalScore(
    { ...NEUTRAL_PROFILE, weeklyVigorousDays: 4, weeklyVigorousMins: 45 }, [0, 0, 0, 0]);
  assert.ok(active > sedentary, "active profile must outscore sedentary");
});

test("environment transit component uses GEB Q3 instead of hardcoded 100", () => {
  const m = new GameStateManager();
  const noTransit = m.calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 0, 2, 2, 2]);
  const fullTransit = m.calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 4, 2, 2, 2]);
  assert.equal(fullTransit - noTransit, 40, "transit is 40% of the environment score");
});

test("relationships score includes RAS only when coupled", () => {
  const m = new GameStateManager();
  const single = m.calculateRelationshipsScore(
    { ...NEUTRAL_PROFILE, relationshipStatus: "Single" }, [3, 3, 3, 3, 3, 3], [1, 1, 1], [5, 5, 5]);
  const coupled = m.calculateRelationshipsScore(
    { ...NEUTRAL_PROFILE, relationshipStatus: "Coupled" }, [3, 3, 3, 3, 3, 3], [1, 1, 1], [5, 5, 5]);
  assert.ok(single > 0 && coupled > 0);
  assert.notEqual(single, coupled);
});

// --- SCORING INTEGRITY (findings #5, #6, #7) ---

test("skipped ST-5 / UCLA default to a neutral midpoint, not the healthiest extreme (#5)", () => {
  const m = new GameStateManager();
  const defOf = key => INSTRUMENTS[key].items.map(it => it.def);
  // ST-5 at its skip-default now reads a neutral 50 stress-resilience: with
  // WHO-5 forced to 0, mental = 0.5*0 + 0.5*50 = 25 (was 50 when ST-5 defaulted
  // to the calmest option and read as 100).
  assert.equal(m.calculateMentalScore({}, defOf("st5"), [0, 0, 0, 0, 0]), 25);
  // UCLA at its skip-default now reads a neutral 50 low-loneliness: with LSNS at
  // 0, relationships = 0.5*0 + 0.5*50 = 25 (was 50 when UCLA defaulted to least
  // lonely and read as 100).
  const single = { relationshipStatus: "Single" };
  assert.equal(m.calculateRelationshipsScore(single, [0, 0, 0, 0, 0, 0], defOf("ucla"), null), 25);
});

test("social contribution now scores the previously-ignored PTM 'help friends/family' item (#6)", () => {
  const m = new GameStateManager();
  const low = m.calculateSocialContributionScore(NEUTRAL_PROFILE, [2, 0, 2, 2, 3]); // Q2 = 0
  const high = m.calculateSocialContributionScore(NEUTRAL_PROFILE, [2, 4, 2, 2, 3]); // Q2 = 4
  assert.ok(high > low, "raising PTM Q2 must raise the score now that it counts");
});

test("environment now scores the previously-ignored GEB avoidance (Q2) and eco-product (Q6) items (#6)", () => {
  const m = new GameStateManager();
  const q2low = m.calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 0, 2, 2, 2, 2]);
  const q2high = m.calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 4, 2, 2, 2, 2]);
  assert.ok(q2high > q2low, "GEB Q2 (single-use avoidance) now counts");
  const q6low = m.calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 2, 2, 2, 0]);
  const q6high = m.calculateEnvironmentScore(NEUTRAL_PROFILE, [2, 2, 2, 2, 2, 4]);
  assert.ok(q6high > q6low, "GEB Q6 (eco-products) now counts");
});

test("physical omits BMI (no fabricated 50) and renormalizes when weight/height are missing (#7)", () => {
  const m = new GameStateManager();
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
  assert.equal(m.calculatePhysicalScore(perfectNoBody, [0, 0, 0, 0]), 100);
});

test("physical still includes body composition when weight/height are present (#7)", () => {
  const m = new GameStateManager();
  const ideal = { ...NEUTRAL_PROFILE, weight: 60, height: 170 }; // BMI ~20.8 -> 100
  const obese = { ...NEUTRAL_PROFILE, weight: 100, height: 160 }; // BMI ~39 -> 25
  assert.ok(
    m.calculatePhysicalScore(ideal, [0, 0, 0, 0]) > m.calculatePhysicalScore(obese, [0, 0, 0, 0]),
    "measured body composition still moves the score"
  );
});

test("addXP handles multiple level-ups in one grant", () => {
  const m = new GameStateManager();
  m.addXP(350); // level 1 needs 100, level 2 needs 200 -> should land on level 3 with 50 xp
  assert.equal(m.state.profile.level, 3);
  assert.equal(m.state.profile.xp, 50);
});

test("logAction enforces the 5-per-day limit per action id", () => {
  const m = new GameStateManager();
  for (let i = 0; i < 5; i++) {
    assert.equal(m.logAction("workout", "Workout", { physical: 5 }, 10).ok, true);
  }
  const sixth = m.logAction("workout", "Workout", { physical: 5 }, 10);
  assert.equal(sixth.ok, false);
  assert.match(sixth.reason, /limit/i);
});

test("goals progress only from their linked action ids", () => {
  const m = new GameStateManager();
  m.initializeDefaultQuests();

  // drink_water advances daily_water but NOT weekly_workout (both aspect=physical)
  m.logAction("drink_water", "Drink Water", { physical: 5 }, 10);
  const water = m.state.goals.find(g => g.id === "daily_water");
  const workout = m.state.goals.find(g => g.id === "weekly_workout");
  assert.equal(water.completed, true, "one water log completes daily hydration");
  assert.equal(workout.currentValue, 0, "water must not advance the workout quest");
});

test("epic savings quest completes after 10 logs with milestone tracking", () => {
  const m = new GameStateManager();
  m.initializeDefaultQuests();
  const epic = () => m.state.goals.find(g => g.id === "epic_savings");

  for (let i = 0; i < 3; i++) m.logAction("save_money", "Save", { finance: 8 }, 20);
  assert.equal(epic().milestones[0].completed, true, "first milestone at 3 logs");
  assert.equal(epic().completed, false);

  // continue across simulated days (daily limit is 5/day)
  m.state.dailyLimits["save_money"] = { count: 0, lastUpdated: "another day" };
  for (let i = 0; i < 5; i++) m.logAction("save_money", "Save", { finance: 8 }, 20);
  m.state.dailyLimits["save_money"] = { count: 0, lastUpdated: "third day" };
  for (let i = 0; i < 2; i++) m.logAction("save_money", "Save", { finance: 8 }, 20);

  assert.equal(epic().completed, true, "10 logs complete the epic quest");
  assert.equal(epic().milestones.every(ms => ms.completed), true);
});

test("daily and weekly quests reset on new periods", () => {
  const m = new GameStateManager();
  m.initializeDefaultQuests();
  m.state.onboarded = true;
  m.logAction("drink_water", "Drink Water", { physical: 5 }, 10);
  assert.equal(m.state.goals.find(g => g.id === "daily_water").completed, true);

  m.state.questResets.daily = "some other day";
  m.resetPeriodicQuests();
  const water = m.state.goals.find(g => g.id === "daily_water");
  assert.equal(water.completed, false);
  assert.equal(water.currentValue, 0);
});

test("custom actions get stable ids and are rate-limited", () => {
  const m = new GameStateManager();
  const action = m.addCustomAction("Meditate", "mental", 5, 15);
  assert.match(action.id, /^custom_/);

  for (let i = 0; i < 5; i++) {
    assert.equal(m.logAction(action.id, action.title, action.impacts, action.xp).ok, true);
  }
  assert.equal(m.logAction(action.id, action.title, action.impacts, action.xp).ok, false);

  m.removeCustomAction(action.id);
  assert.equal(m.state.customActions.length, 0);
  assert.equal(m.state.dailyLimits[action.id], undefined, "limits entry cleaned up");
});

test("same-schema saves merge over defaults (field backfill)", () => {
  installMockStorage({
    lifequest_state: JSON.stringify({
      schemaVersion: 3,
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
  assert.deepEqual(m.state.customActions, [], "new fields are backfilled");
  assert.ok(m.state.questResets, "questResets backfilled");
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

test("logAction stores real quantities on history entries", () => {
  const m = new GameStateManager();
  m.logAction("workout", "Exercise Session", { physical: 10 }, 30, { value: 45, unit: "minutes", label: "Duration" });
  m.logAction("phys_sigh", "Physiological Sigh", { mental: 5 }, 10);
  assert.deepEqual(m.state.history[1].quantity, { value: 45, unit: "minutes", label: "Duration" });
  assert.equal(m.state.history[0].quantity, undefined, "event-only actions have no quantity");
  assert.equal(m.state.history[1].actionId, "workout", "actionId recorded for measured scoring");
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
  m.logAction("save_money", "Add to Savings", { finance: 8 }, 20, { value: 1500, unit: "THB", label: "Amount saved" });
  const backup = m.exportState();

  installMockStorage();
  const restored = new GameStateManager();
  restored.importState(backup);
  assert.equal(restored.state.profile.name, "Backup User");
  assert.equal(restored.state.history[0].quantity.value, 1500);
  assert.equal(restored.state.onboarded, true);
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

test("saveState reports failure instead of swallowing it; logAction flags a non-persisted write (#1)", () => {
  const m = new GameStateManager();
  // Simulate a full quota / Safari Private Mode: every write throws.
  globalThis.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.equal(m.saveState(), false, "saveState returns false when the write is rejected");
  const result = m.logAction("workout", "Workout", { physical: 5 }, 10);
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false, "logAction reports that the write did not persist");
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
    schemaVersion: 3,
    profile: { name: "<img src=x onerror=alert(1)>", level: "<script>", xp: "abc", rank: "<b>evil</b>" },
    aspects: { finance: 55, "<img onerror=alert(1)>": 90, physical: 999 },
    friends: [{ id: '"><script>', name: "Mallory", level: "<x>", totalPoints: "NaN", aspects: {} }],
    customActions: [{ id: '"><img>', title: "x", aspect: "evilKey", impacts: {} }]
  };
  m.importState(JSON.stringify(hostile));
  const s = m.state;
  // Aspects: only the eight known keys survive, each clamped to 0-100.
  assert.equal(Object.keys(s.aspects).length, 8);
  assert.equal(s.aspects["<img onerror=alert(1)>"], undefined, "injected aspect key dropped");
  assert.equal(s.aspects.physical, 100, "out-of-range aspect clamped");
  // Profile scalars coerced; rank derived from level, so it is always a known enum.
  assert.equal(typeof s.profile.level, "number");
  assert.equal(s.profile.xp, 0, "non-numeric xp coerced to 0");
  assert.equal(s.profile.rank, m.getRank(s.profile.level), "rank recomputed, not trusted");
  // Friend id reduced to a safe token; level/points coerced to numbers.
  assert.match(s.friends[0].id, /^[A-Za-z0-9_-]+$/, "friend id stripped to a safe token");
  assert.equal(typeof s.friends[0].level, "number");
  assert.equal(typeof s.friends[0].totalPoints, "number");
  // A custom action with an unknown aspect is dropped entirely.
  assert.equal(s.customActions.length, 0, "custom action with unknown aspect rejected");
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

test("history is capped at 500 entries", () => {
  const m = new GameStateManager();
  for (let i = 0; i < 510; i++) {
    // unique ids to dodge the daily limit
    m.logAction(`a${i}`, "Act", { mental: 1 }, 1);
  }
  assert.equal(m.state.history.length, 500);
});
