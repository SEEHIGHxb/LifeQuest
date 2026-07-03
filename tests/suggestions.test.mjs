// Tests for the rule-based, profile-aware suggestion engine (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { getAspectSuggestions, getTopSuggestions } from "../suggestions.js";
import { ASPECT_KEYS } from "../aspects.js";

// A deliberately weak profile/baseline so every aspect has low components.
const WEAK_PROFILE = {
  income: 8000,
  region: "Provinces",
  gender: "male",
  employment: "Office Worker",
  relationshipStatus: "Single",
  savingsRate: 0,
  digitalLiteracy: 20,
  weeklyLearningHours: 0.5,
  weeklyVigorousDays: 0,
  weeklyVigorousMins: 0,
  weeklyModerateDays: 0,
  weeklyModerateMins: 0,
  weeklyWalkingDays: 1,
  weeklyWalkingMins: 10,
  weight: 85,
  height: 170,
  sleepHours: 5,
  vegetablePortions: 1,
  waterLiters: 0.5,
  singleUsePlastics: 12,
  monthlyDonations: 0,
  volunteeringHours: 0,
  longTermInvestments: false
};

const WEAK_BASELINE = {
  date: "2026-06-01T00:00:00.000Z",
  cfpb: 5, jss: 12, st5: 8, who5: 8, lsns: 8, ucla: 8,
  ras: null, gse: 10, grit: 8, ptm: 5, geb: 6, lfis: 5
};

function makeState(overrides = {}) {
  return {
    profile: { ...WEAK_PROFILE, ...(overrides.profile || {}) },
    baseline: "baseline" in overrides ? overrides.baseline : { ...WEAK_BASELINE, ...(overrides.baselinePatch || {}) },
    aspects: { finance: 20, physical: 25, mental: 30, relationships: 30, personalGoals: 30, socialContribution: 15, environment: 20, humanityFuture: 15 },
    snapshots: []
  };
}

test("every aspect yields well-formed suggestions for a weak profile", () => {
  const state = makeState();
  for (const key of ASPECT_KEYS) {
    const suggestions = getAspectSuggestions(state, key);
    assert.ok(suggestions.length > 0, `${key} has suggestions`);
    suggestions.forEach(s => {
      assert.equal(s.aspect, key);
      assert.ok(s.title && s.text, `${key} suggestion carries title + text`);
      assert.ok(s.componentKey && s.componentLabel, `${key} suggestion names its component`);
      assert.ok(s.componentValue >= 0 && s.componentValue < 70, `${key} targets a weak component`);
    });
  }
  assert.deepEqual(getAspectSuggestions(state, "notAnAspect"), []);
});

test("suggestions are ordered weakest component first", () => {
  const suggestions = getAspectSuggestions(makeState(), "physical");
  const values = suggestions.map(s => s.componentValue);
  assert.deepEqual(values, [...values].sort((a, b) => a - b));
});

test("healthy components (>=70) produce no suggestion", () => {
  const state = makeState({ profile: { savingsRate: 25 } });
  const finance = getAspectSuggestions(state, "finance");
  assert.ok(!finance.some(s => s.componentKey === "savings"), "healthy savings must not be suggested");
});

test("activity advice adapts to region", () => {
  const bkk = getAspectSuggestions(makeState({ profile: { region: "Bangkok" } }), "physical")
    .find(s => s.componentKey === "activity");
  const prov = getAspectSuggestions(makeState(), "physical")
    .find(s => s.componentKey === "activity");
  assert.match(bkk.text, /BTS|MRT/, "Bangkok advice mentions transit walking");
  assert.doesNotMatch(prov.text, /BTS|MRT/, "Provinces advice does not assume BTS");
  assert.notEqual(bkk.text, prov.text);
});

test("income advice adapts to employment status", () => {
  const byEmployment = emp => getAspectSuggestions(
    makeState({ profile: { employment: emp } }), "finance"
  ).find(s => s.componentKey === "income");
  const student = byEmployment("Student");
  const freelancer = byEmployment("Freelancer");
  const office = byEmployment("Office Worker");
  assert.match(student.text, /internship/i);
  assert.match(freelancer.text, /rates|client/i);
  assert.notEqual(student.text, office.text);
});

test("romantic suggestion appears only for coupled users", () => {
  const single = getAspectSuggestions(makeState(), "relationships");
  assert.ok(!single.some(s => s.componentKey === "ras"));
  const coupled = getAspectSuggestions(makeState({
    profile: { relationshipStatus: "Coupled" },
    baselinePatch: { ras: 6 }
  }), "relationships");
  assert.ok(coupled.some(s => s.componentKey === "ras"), "coupled + low RAS gets the date suggestion");
});

test("getTopSuggestions caps the list and dedupes by aspect", () => {
  const top = getTopSuggestions(makeState(), 3);
  assert.equal(top.length, 3);
  const aspects = top.map(s => s.aspect);
  assert.equal(new Set(aspects).size, aspects.length, "one suggestion per aspect");
  const values = top.map(s => s.componentValue);
  assert.deepEqual(values, [...values].sort((a, b) => a - b), "weakest aspects surface first");
});

test("suggestion actionIds reference preset routine ids when present", () => {
  const KNOWN_PRESETS = new Set([
    "save_money", "cbt_journal", "phys_sigh", "workout", "eat_veggies", "drink_water",
    "call_friend", "date_night", "make_merit", "volunteer", "recycle_waste",
    "public_transit", "learn_future_skills", "mentor_someone"
  ]);
  for (const key of ASPECT_KEYS) {
    for (const s of getAspectSuggestions(makeState(), key)) {
      if (s.actionId !== undefined) {
        assert.ok(KNOWN_PRESETS.has(s.actionId), `${s.componentKey} links a real preset (${s.actionId})`);
      }
    }
  }
});
