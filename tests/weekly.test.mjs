// Tests for the weekly-review redesign (node --test): the measured aspect
// shifts, pledge grading, the once-per-ISO-week review lifecycle, and the
// v3 -> v4 save migration.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";
import { weeklyAspectShifts, calculatePhysicalScore } from "../scoring.js";
import { gradeGoal, clampPledgeTarget } from "../goals.js";

function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => installMockStorage());

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

// --- MEASURED SHIFT MATH (weeklyAspectShifts vs hand-computed weights) ---

const BASE = {
  income: 15000, region: "Provinces", savingsRate: 0, relationshipStatus: "Single",
  age: 30, weight: 60, height: 170, sleepHours: 7, vegetablePortions: 2, waterLiters: 1.5,
  weeklyVigorousDays: 0, weeklyVigorousMins: 0, weeklyModerateDays: 0, weeklyModerateMins: 0,
  weeklyWalkingDays: 3, weeklyWalkingMins: 20, weeklyLearningHours: 0, digitalLiteracy: 50,
  monthlyDonations: 0, volunteeringHours: 0, singleUsePlastics: 3, longTermInvestments: false
};
const JSS_BASELINE = { jss: 4 };

test("an unchanged week shifts nothing", () => {
  assert.deepEqual(weeklyAspectShifts(BASE, { ...BASE }, JSS_BASELINE), {});
});

test("plastics 3/day -> 0/day raises environment by exactly the published weight chain", () => {
  // plasticScore: 3/day = 50, 0/day = 100. Weight chain 0.4 (waste) x 0.5
  // (plastic share) => +10. Nothing else changed, so nothing else shifts.
  const shifts = weeklyAspectShifts(BASE, { ...BASE, singleUsePlastics: 0 }, JSS_BASELINE);
  assert.deepEqual(shifts, { environment: 10 });
});

test("savings rate 0% -> 20% adds exactly the +10 finance bonus", () => {
  const shifts = weeklyAspectShifts(BASE, { ...BASE, savingsRate: 20 }, JSS_BASELINE);
  assert.deepEqual(shifts, { finance: 10 });
});

test("learning hours feed personalGoals (0.3 x learningScore) and humanityFuture (0.125 x futureStudy)", () => {
  // learningScore: 0.5*(hours/5*100) + 0.5*digitalLiteracy => 25 -> 75 (+50);
  // personalGoals delta = 0.3 * 50 = 15.
  // futureStudyScore: hours/4*100 capped => 0 -> 100; humanityFuture delta
  // = 0.25 * 0.5 * 100 = 12.5, rounded half-up to 13.
  const shifts = weeklyAspectShifts(BASE, { ...BASE, weeklyLearningHours: 5 }, JSS_BASELINE);
  assert.deepEqual(shifts, { personalGoals: 15, humanityFuture: 13 });
});

test("donations and volunteering shift socialContribution by their factor weights", () => {
  // donationVolumeFactor: 500 THB/mo maxes it (0 -> 100); weight 0.4*0.5 => +20.
  assert.deepEqual(
    weeklyAspectShifts(BASE, { ...BASE, monthlyDonations: 500 }, JSS_BASELINE),
    { socialContribution: 20 }
  );
  // volunteerFactor: 4 h/mo maxes it (0 -> 100); weight 0.4*0.6 => +24.
  assert.deepEqual(
    weeklyAspectShifts(BASE, { ...BASE, volunteeringHours: 4 }, JSS_BASELINE),
    { socialContribution: 24 }
  );
});

test("the physical shift is the full-calculator difference (renormalization included)", () => {
  const newP = { ...BASE, weeklyVigorousDays: 4, weeklyVigorousMins: 45, sleepHours: 8, waterLiters: 2.5 };
  const jss = [JSS_BASELINE.jss];
  const expected = calculatePhysicalScore(newP, jss) - calculatePhysicalScore(BASE, jss);
  assert.equal(weeklyAspectShifts(BASE, newP, JSS_BASELINE).physical, expected);
  assert.ok(expected > 0, "the more active week must score higher");
});

test("mental and relationships are never shifted by a weekly review", () => {
  // Even a week that changes every measured field: the survey-only aspects
  // have no weekly-measured input (sleep feeds physical, not mental).
  const everything = {
    ...BASE, weeklyVigorousDays: 5, weeklyVigorousMins: 60, sleepHours: 9,
    waterLiters: 3, vegetablePortions: 5, weeklyLearningHours: 6,
    singleUsePlastics: 0, savingsRate: 30, monthlyDonations: 1000, volunteeringHours: 8
  };
  const shifts = weeklyAspectShifts(BASE, everything, JSS_BASELINE);
  assert.ok(!("mental" in shifts), "mental untouched");
  assert.ok(!("relationships" in shifts), "relationships untouched");
});

// --- PLEDGE GRADING (pure goals.js) ---

test("gradeGoal grades gte and lte pledges against the measured profile", () => {
  assert.deepEqual(gradeGoal({ templateId: "water", target: 2 }, { waterLiters: 2 }), { value: 2, met: true });
  assert.equal(gradeGoal({ templateId: "water", target: 2 }, { waterLiters: 1.9 }).met, false);
  assert.equal(gradeGoal({ templateId: "plastics", target: 2 }, { singleUsePlastics: 2 }).met, true, "lte: at the cap counts");
  assert.equal(gradeGoal({ templateId: "plastics", target: 2 }, { singleUsePlastics: 3 }).met, false);
  assert.equal(gradeGoal({ templateId: "notATemplate", target: 2 }, {}).met, false, "unknown template never met");
});

test("derived metrics grade exercise days and MET-minutes from the activity fields", () => {
  const p = {
    weeklyVigorousDays: 2, weeklyVigorousMins: 30,
    weeklyModerateDays: 2, weeklyModerateMins: 30,
    weeklyWalkingDays: 0, weeklyWalkingMins: 0
  };
  assert.deepEqual(gradeGoal({ templateId: "exerciseDays", target: 3 }, p), { value: 4, met: true });
  // MET = 8*2*30 + 4*2*30 = 720.
  assert.deepEqual(gradeGoal({ templateId: "metMinutes", target: 600 }, p), { value: 720, met: true });
  assert.equal(gradeGoal({ templateId: "metMinutes", target: 600 }, { ...p, weeklyVigorousDays: 0 }).met, false);
});

test("clampPledgeTarget bounds targets to the template and defaults non-numbers", () => {
  assert.equal(clampPledgeTarget("water", 999), 5);
  assert.equal(clampPledgeTarget("water", 0), 0.5);
  assert.equal(clampPledgeTarget("water", "abc"), 2, "non-numeric falls back to the template default");
  assert.equal(clampPledgeTarget("notATemplate", 3), null);
});

// --- THE WEEKLY REVIEW LIFECYCLE ---

const MINIMAL_SURVEY = {
  name: "Weekly", age: "30", gender: "male", region: "Bangkok",
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

function onboardedManager() {
  const m = new GameStateManager();
  m.submitOnboarding(MINIMAL_SURVEY);
  return m;
}

test("the review is due once per ISO week; onboarding counts as that week's measurement", () => {
  const m = onboardedManager();
  assert.equal(m.isWeeklyReviewDue(), false, "onboarding just measured this week");
  m.state.baseline.date = daysAgo(8);
  assert.equal(m.isWeeklyReviewDue(), true, "due the following ISO week");
  assert.ok(m.submitWeeklyReview({ waterLiters: 2 }), "submission accepted");
  assert.equal(m.isWeeklyReviewDue(), false, "submitting settles the week");
  assert.equal(m.submitWeeklyReview({ waterLiters: 2 }), null, "a second same-week submission is refused");
  assert.equal(m.state.reviews.length, 1, "no duplicate record");
});

test("no review without an onboarding baseline", () => {
  const m = new GameStateManager();
  assert.equal(m.isWeeklyReviewDue(), false);
  assert.equal(m.submitWeeklyReview({ waterLiters: 2 }), null);
});

test("submitWeeklyReview writes measured quantities into the profile and marks them provided", () => {
  const m = onboardedManager();
  m.state.baseline.date = daysAgo(8);
  const record = m.submitWeeklyReview({ waterLiters: "2.5", sleepHours: 8, junk: 99, weight: 100 });
  assert.equal(m.state.profile.waterLiters, 2.5, "string quantities land as numbers");
  assert.equal(m.state.profile.sleepHours, 8);
  assert.equal(m.state.profile.provided.waterLiters, true, "measured fields upgrade confidence");
  assert.equal(m.state.profile.weight, 60, "non-weekly fields are ignored");
  assert.equal("junk" in m.state.profile, false, "unknown fields never land");
  assert.deepEqual(record.inputs, { waterLiters: 2.5, sleepHours: 8 });
  assert.equal(record.week, m.state.reviews[0].week);
});

test("submitWeeklyReview range-clamps absurd inputs and drops non-numeric ones", () => {
  const m = onboardedManager();
  m.state.baseline.date = daysAgo(8);
  m.submitWeeklyReview({ waterLiters: "abc", singleUsePlastics: 9999 });
  assert.equal(m.state.profile.waterLiters, 1.5, "non-numeric input leaves the old measurement");
  assert.equal(m.state.profile.singleUsePlastics, 100, "absurd quantity clamped to the sanitizer bound");
});

test("submitWeeklyReview applies measured score shifts through the shared formulas", () => {
  const m = onboardedManager();
  m.state.baseline.date = daysAgo(8);
  const envBefore = m.state.aspects.environment;
  const record = m.submitWeeklyReview({ singleUsePlastics: 0 });
  // Onboarded at 5/day (plasticScore 50) -> 0/day (100): 0.4*0.5*50 = +10.
  assert.equal(record.shifts.environment, 10);
  assert.equal(m.state.aspects.environment, Math.min(100, envBefore + 10));
});

test("a review pays base XP plus each met pledge's XP, and grades every pledge", () => {
  const m = onboardedManager();
  m.state.baseline.date = daysAgo(8);
  const before = m.state.profile.lifetimeXp;
  // Default pledges: water>=2, exerciseDays>=3, sleep>=7. Meet water and sleep
  // (sleep 7 carried from onboarding); no exercise reported.
  const record = m.submitWeeklyReview({ waterLiters: 2 });
  assert.equal(record.goals.length, 3, "every pledge graded");
  assert.equal(record.goals.filter(g => g.met).length, 2);
  assert.equal(record.xp, 60 + 25 + 25, "base 60 + water 25 + sleep 25");
  assert.equal(m.state.profile.lifetimeXp - before, 110);

  const water = m.state.goals.find(g => g.templateId === "water");
  assert.equal(water.streak, 1, "a met pledge starts a streak");
  assert.equal(water.lastResult.met, true);
  const exercise = m.state.goals.find(g => g.templateId === "exerciseDays");
  assert.equal(exercise.streak, 0, "a missed pledge resets its streak");
  assert.equal(exercise.lastResult.met, false);
});

test("review history is capped at 260 records, newest kept", () => {
  const m = onboardedManager();
  m.state.baseline.date = daysAgo(8);
  m.state.reviews = Array.from({ length: 260 }, (_, i) => ({
    date: daysAgo(400), week: `2020-W${i}`, inputs: {}, shifts: {}, goals: [], xp: 60
  }));
  const record = m.submitWeeklyReview({ waterLiters: 2 });
  assert.equal(m.state.reviews.length, 260);
  assert.equal(m.state.reviews[m.state.reviews.length - 1].week, record.week, "newest record kept, oldest dropped");
});

test("countReviewsSince counts only records on or after the given date", () => {
  const m = new GameStateManager();
  m.state.reviews = [
    { date: daysAgo(40), week: "a", inputs: {}, shifts: {}, goals: [], xp: 60 },
    { date: daysAgo(10), week: "b", inputs: {}, shifts: {}, goals: [], xp: 60 },
    { date: daysAgo(1), week: "c", inputs: {}, shifts: {}, goals: [], xp: 60 }
  ];
  assert.equal(m.countReviewsSince(daysAgo(30)), 2);
  assert.equal(m.countReviewsSince(daysAgo(50)), 3);
});

// --- v3 -> v4 MIGRATION (the weekly-review redesign must not lose data) ---

const V3_SAVE = {
  schemaVersion: 3,
  onboarded: true,
  profile: { name: "Migrator", level: 7, xp: 40, lifetimeXp: 2140, digitalLiteracy: 60 },
  aspects: { finance: 61, physical: 55 },
  history: [{ timestamp: "2026-06-01T00:00:00.000Z", title: "Workout", impacts: { physical: 5 } }],
  goals: [
    { id: "daily_water", title: "Daily Hydration", type: "daily", targetValue: 1, currentValue: 0 },
    { id: "weekly_workout", title: "Weekly Warrior", type: "weekly", targetValue: 3, currentValue: 1 },
    { id: "epic_savings", title: "Savings Champion", type: "epic", targetValue: 10, currentValue: 2 },
    { id: "daily_sigh", title: "Breathing Reset", type: "daily", targetValue: 1, currentValue: 0 },
    { id: "custom_abc", title: "My Custom", type: "daily", targetValue: 1, currentValue: 0 },
    null
  ],
  commitment: { aspect: "physical", weeklyTarget: 5, progress: 2, completed: false },
  customActions: [{ id: "custom_abc", title: "My Custom", aspect: "mental", impacts: { mental: 2 }, xp: 5 }],
  dailyLimits: { workout: { count: 2, lastUpdated: "2026-06-01" } },
  questResets: { daily: "2026-06-01", weekly: "2026-W23" },
  snapshots: [{ date: "2026-06-01T00:00:00.000Z", aspects: { finance: 61 } }],
  checkins: [],
  baseline: {
    date: "2026-05-01T00:00:00.000Z",
    cfpb: 10, jss: 4, st5: 3, who5: 17, lsns: 17, ucla: 4,
    ras: null, gse: 18, grit: 14, ptm: 10, geb: 12, lfis: 10
  }
};

test("a v3 save migrates in place: XP, scores, baseline, and archive all carry over", () => {
  installMockStorage({ lifequest_state: JSON.stringify(V3_SAVE) });
  const m = new GameStateManager();
  assert.equal(m.state.onboarded, true, "no fresh start");
  assert.equal(m.state.schemaVersion, 5, "a v3 save chains v3 -> v4 -> v5 in one load");
  assert.equal(m.state.profile.name, "Migrator");
  assert.equal(m.state.profile.level, 7);
  assert.equal(m.state.profile.lifetimeXp, 2140, "lifetime points survive");
  assert.equal(m.state.aspects.finance, 61);
  assert.equal(m.state.baseline.who5, 17, "baseline instrument sums survive");
  assert.equal(m.state.history.length, 1, "action log kept as a read-only archive");
  assert.equal(m.state.snapshots.length, 1);
  assert.deepEqual(m.state.reviews, [], "review history starts empty");
  assert.equal(m.hasRecoverableSave(), false, "migration is not a compatibility failure");
});

test("v3 default quests convert to their pledge equivalents; the rest are dropped", () => {
  installMockStorage({ lifequest_state: JSON.stringify(V3_SAVE) });
  const m = new GameStateManager();
  assert.deepEqual(
    m.state.goals.map(g => [g.templateId, g.target]),
    [["water", 2], ["exerciseDays", 3], ["savings", 10]],
    "daily_water/weekly_workout/epic_savings map to quantity pledges; daily_sigh and customs have no measurable field"
  );
  for (const g of m.state.goals) {
    assert.match(g.id, /^goal_/);
    assert.equal(g.streak, 0);
    assert.equal(g.lastResult, null);
  }
});

test("the retired v3 machinery does not survive migration", () => {
  installMockStorage({ lifequest_state: JSON.stringify(V3_SAVE) });
  const m = new GameStateManager();
  for (const key of ["commitment", "customActions", "dailyLimits", "questResets"]) {
    assert.equal(key in m.state, false, `${key} dropped`);
  }
});

test("a v3 backup imports through the same migration", () => {
  const m = new GameStateManager();
  m.importState(JSON.stringify(V3_SAVE));
  assert.equal(m.state.onboarded, true);
  assert.equal(m.state.schemaVersion, 5, "a v3 save chains v3 -> v4 -> v5 in one load");
  assert.equal(m.state.goals.length, 3);
  assert.equal(m.state.profile.lifetimeXp, 2140);
});
