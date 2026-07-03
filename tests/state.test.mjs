// Tests for GameStateManager scoring and game logic (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";

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

test("loadState merges legacy saves over new defaults (migration)", () => {
  // Legacy v1 save: missing customActions, questResets, several profile fields
  installMockStorage({
    lifequest_state: JSON.stringify({
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

test("corrupt saved state falls back to defaults", () => {
  installMockStorage({ lifequest_state: "{not json" });
  const m = new GameStateManager();
  assert.equal(m.state.onboarded, false);
  assert.equal(m.state.profile.name, "Guest");
});

test("history is capped", () => {
  const m = new GameStateManager();
  for (let i = 0; i < 210; i++) {
    // unique ids to dodge the daily limit
    m.logAction(`a${i}`, "Act", { mental: 1 }, 1);
  }
  assert.ok(m.state.history.length <= 200);
});
