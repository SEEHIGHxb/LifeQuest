// sanitize.js - Import sanitizers: coerce untrusted saved/imported state back
// to known shapes (defence-in-depth for backup import / reload).
//
// A saved/imported state is untrusted input: a hand-edited backup can carry
// hostile strings that reach innerHTML sinks. These coerce imported data back to
// known shapes so nothing can smuggle markup through the header, leaderboard, or
// aspect labels. Escaping still happens at each sink too — this is belt AND
// suspenders, not a replacement for it.

import { DEFAULT_STATE } from "./defaults.js";
import { goalTemplate, clampPledgeTarget, createPledge } from "./goals.js";

const ASPECT_SCORE_KEYS = Object.keys(DEFAULT_STATE.aspects);
const SAFE_ID_RE = /[^A-Za-z0-9_-]/g;
const REVIEW_GOAL_RESULT_LIMIT = 12;

// The profile fields that select a benchmark norm. An unknown value here does
// not just look wrong — it silently misses every lookup table in benchmarks.js
// and would score the user against nothing, so imports snap back to a default.
const PROFILE_ENUMS = {
  gender: ["male", "female", "unspecified"],
  region: ["Provinces", "Bangkok"],
  employment: ["Office Worker", "Freelancer", "Business Owner", "Unemployed", "Student"],
  relationshipStatus: ["Single", "Coupled"]
};

// Numeric profile fields: [min, max]. Bounds are generous — the point is to
// reject NaN/Infinity/strings and absurd values that would poison the score
// math or the benchmark percentiles, not to re-validate the onboarding form.
const PROFILE_NUMERIC = {
  age: [1, 120],
  income: [0, 100000000],
  savingsRate: [0, 100],
  digitalLiteracy: [0, 100],
  weeklyLearningHours: [0, 168],
  weeklyVigorousDays: [0, 7],
  weeklyVigorousMins: [0, 1440],
  weeklyModerateDays: [0, 7],
  weeklyModerateMins: [0, 1440],
  weeklyWalkingDays: [0, 7],
  weeklyWalkingMins: [0, 1440],
  weight: [1, 500],
  height: [50, 260],
  sleepHours: [0, 24],
  vegetablePortions: [0, 30],
  waterLiters: [0, 20],
  singleUsePlastics: [0, 100],
  monthlyDonations: [0, 100000000],
  volunteeringHours: [0, 168]
};

// Finite number clamped to [min, max]; `fallback` when the value isn't numeric.
export function clampNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Plain string, length-capped. Non-strings collapse to "".
export function safeString(value, maxLen = 200) {
  return typeof value === "string" ? value.slice(0, maxLen) : "";
}

// Reduce an id to a safe [A-Za-z0-9_-] token so it can never break out of the
// HTML attribute it is rendered into. Empty results get a fresh prefixed id.
export function safeId(value, prefix) {
  const cleaned = safeString(value, 40).replace(SAFE_ID_RE, "");
  return cleaned || `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

// Keep ONLY the eight known aspect keys, each a clamped 0-100 number. Unknown
// keys are dropped: they would otherwise be echoed verbatim as labels into
// innerHTML (a stored-XSS sink) and corrupt the score math.
export function sanitizeAspectScores(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of ASPECT_SCORE_KEYS) {
    out[key] = clampNumber(src[key], 0, 100, 0);
  }
  return out;
}

// Rebuild an imported crewmate to a known, type-safe shape (its id/level/points
// are rendered into the leaderboard without escaping upstream of here).
export function sanitizeImportedFriend(f) {
  if (!f || typeof f !== "object") return null;
  const name = safeString(f.name, 40).trim();
  if (!name) return null;
  return {
    id: safeId(f.id, "crew"),
    name,
    level: Math.round(clampNumber(f.level, 1, 999, 1)),
    totalPoints: Math.round(clampNumber(f.totalPoints, 0, 10000000, 0)),
    aspects: sanitizeAspectScores(f.aspects),
    addedAt: safeString(f.addedAt, 40) || new Date().toISOString()
  };
}

// Rebuild an imported pledge to a known shape. templateId must name a real
// template — everything user-facing (title, description, unit, XP) derives
// from the template at render time, so an unknown or hostile templateId is
// dropped whole rather than coerced: there is nothing safe to render it as.
// The target is clamped to the template's own bounds and lastResult is
// rebuilt field by field (its week/value reach the Goals tab UI).
export function sanitizeImportedGoal(g) {
  if (!g || typeof g !== "object") return null;
  if (!goalTemplate(g.templateId)) return null;
  const goal = {
    id: safeId(g.id, "goal"),
    templateId: g.templateId,
    target: clampPledgeTarget(g.templateId, g.target),
    streak: Math.round(clampNumber(g.streak, 0, 100000, 0)),
    lastResult: null
  };
  if (g.lastResult && typeof g.lastResult === "object") {
    goal.lastResult = {
      week: safeString(g.lastResult.week, 12),
      value: clampNumber(g.lastResult.value, -1000000, 1000000, 0),
      met: g.lastResult.met === true
    };
  }
  return goal;
}

// Rebuild an imported weekly-review record. Reviews are display history (the
// dashboard's Recent Reviews and the review page's past list), so a record
// that can't carry a real date is dropped and every number is clamped.
export function sanitizeImportedReview(r) {
  if (!r || typeof r !== "object") return null;
  const date = safeString(r.date, 40);
  if (!Number.isFinite(new Date(date).getTime())) return null;

  const inputs = {};
  if (r.inputs && typeof r.inputs === "object") {
    for (const [key, [min, max]] of Object.entries(PROFILE_NUMERIC)) {
      if (Object.hasOwn(r.inputs, key)) inputs[key] = clampNumber(r.inputs[key], min, max, min);
    }
  }
  const shifts = {};
  if (r.shifts && typeof r.shifts === "object") {
    for (const key of ASPECT_SCORE_KEYS) {
      if (Object.hasOwn(r.shifts, key)) shifts[key] = Math.round(clampNumber(r.shifts[key], -100, 100, 0));
    }
  }
  const goals = Array.isArray(r.goals)
    ? r.goals.slice(0, REVIEW_GOAL_RESULT_LIMIT).map(gr => {
        if (!gr || typeof gr !== "object" || !goalTemplate(gr.templateId)) return null;
        return {
          id: safeId(gr.id, "goal"),
          templateId: gr.templateId,
          target: clampPledgeTarget(gr.templateId, gr.target),
          value: clampNumber(gr.value, -1000000, 1000000, 0),
          met: gr.met === true
        };
      }).filter(Boolean)
    : [];

  return {
    date,
    week: safeString(r.week, 12),
    inputs,
    shifts,
    goals,
    xp: Math.round(clampNumber(r.xp, 0, 10000, 0))
  };
}

// --- v3 -> v4 MIGRATION (the weekly-review redesign) ---

// The three default count-goals with a measurable quantity equivalent.
const V3_GOAL_MAP = {
  daily_water: { templateId: "water", target: 2 },
  weekly_workout: { templateId: "exerciseDays", target: 3 },
  epic_savings: { templateId: "savings", target: 10 }
};

// One-way, lossless where a v4 meaning exists: keeps profile/XP/level,
// aspects, baseline (incl. deep), snapshots, checkins, friends, and the old
// action history as a read-only archive. daily_sigh, custom goals, custom
// routines, and the commitment pledge have no quantity field to grade
// against and are dropped (documented in the CHANGELOG). The result still
// passes through mergeSavedState's sanitizers afterwards.
export function migrateV3State(parsed) {
  const out = { ...parsed };
  out.schemaVersion = 4;
  out.reviews = [];
  out.goals = (Array.isArray(parsed.goals) ? parsed.goals : [])
    .map(g => (g && typeof g.id === "string" && Object.hasOwn(V3_GOAL_MAP, g.id)) ? V3_GOAL_MAP[g.id] : null)
    .filter(Boolean)
    .map(m => createPledge(m.templateId, m.target));
  delete out.commitment;
  delete out.customActions;
  delete out.dailyLimits;
  delete out.questResets;
  return out;
}

// Coerce the profile's enum + numeric fields back to known values. Anything
// unrecognised falls back to the DEFAULT_STATE value for that field.
export function sanitizeProfileFields(profile) {
  for (const [key, allowed] of Object.entries(PROFILE_ENUMS)) {
    if (!allowed.includes(profile[key])) profile[key] = DEFAULT_STATE.profile[key];
  }
  for (const [key, [min, max]] of Object.entries(PROFILE_NUMERIC)) {
    profile[key] = clampNumber(profile[key], min, max, DEFAULT_STATE.profile[key]);
  }
  profile.longTermInvestments = profile.longTermInvestments === true;
  profile.assessmentComplete = profile.assessmentComplete !== false;
  return profile;
}
