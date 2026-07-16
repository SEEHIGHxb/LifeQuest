// sanitize.js - Import sanitizers: coerce untrusted saved/imported state back
// to known shapes (defence-in-depth for backup import / reload).
//
// A saved/imported state is untrusted input: a hand-edited backup can carry
// hostile strings that reach innerHTML sinks. These coerce imported data back to
// known shapes so nothing can smuggle markup through the header, leaderboard, or
// aspect labels. Escaping still happens at each sink too — this is belt AND
// suspenders, not a replacement for it.

import { DEFAULT_STATE } from "./defaults.js";

const ASPECT_SCORE_KEYS = Object.keys(DEFAULT_STATE.aspects);
const SAFE_ID_RE = /[^A-Za-z0-9_-]/g;
const GOAL_TYPES = ["daily", "weekly", "epic"];
const MILESTONE_LIMIT = 10;

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

// Rebuild an imported custom routine to a known shape. Title/desc are escaped at
// the sink, but the id is an attribute sink and the aspect must be a real key.
export function sanitizeImportedCustomAction(a) {
  if (!a || typeof a !== "object") return null;
  const aspect = ASPECT_SCORE_KEYS.includes(a.aspect) ? a.aspect : null;
  if (!aspect) return null;
  const pts = Math.round(clampNumber((a.impacts || {})[aspect], 1, 15, 5));
  return {
    id: safeId(a.id, "custom"),
    title: safeString(a.title, 60).trim() || "Custom Routine",
    aspect,
    impacts: { [aspect]: pts },
    xp: Math.round(clampNumber(a.xp, 5, 50, 15)),
    desc: safeString(a.desc, 160)
  };
}

// Rebuild an imported goal to a known shape. This one matters more than it
// looks: renderQuests prints `t(goal.type.toUpperCase())` and interpolates
// `xpReward` through tp(), and neither t() nor tp() escapes — so a hand-edited
// backup carrying markup in `type` would land straight in innerHTML. Coercing
// `type` to an enum and the rewards to numbers closes that at the boundary.
// Shape also has to hold up for the score math: updateQuestProgress calls
// goal.actionIds.includes(...) and iterates milestones, both of which throw on
// a non-array, and a NaN targetValue would make the progress bar NaN%.
export function sanitizeImportedGoal(g) {
  if (!g || typeof g !== "object") return null;
  const title = safeString(g.title, 60).trim();
  if (!title) return null;

  const targetValue = Math.round(clampNumber(g.targetValue, 1, 100000, 1));
  const milestones = Array.isArray(g.milestones)
    ? g.milestones.slice(0, MILESTONE_LIMIT).map(m => {
        const text = safeString(m && m.text, 80).trim();
        if (!text) return null;
        return {
          text,
          at: Math.round(clampNumber(m.at, 0, targetValue, targetValue)),
          completed: m.completed === true
        };
      }).filter(Boolean)
    : null;

  const goal = {
    id: safeId(g.id, "goal"),
    title,
    description: safeString(g.description, 200),
    aspect: ASPECT_SCORE_KEYS.includes(g.aspect) ? g.aspect : ASPECT_SCORE_KEYS[0],
    type: GOAL_TYPES.includes(g.type) ? g.type : "daily",
    actionIds: Array.isArray(g.actionIds)
      ? g.actionIds.map(id => safeString(id, 40)).filter(Boolean).slice(0, 20)
      : [],
    targetValue,
    currentValue: Math.round(clampNumber(g.currentValue, 0, targetValue, 0)),
    xpReward: Math.round(clampNumber(g.xpReward, 0, 10000, 0)),
    completed: g.completed === true
  };
  // Absent milestones and an empty list mean different things to renderQuests
  // (it branches on `goal.milestones` being truthy), so keep the key off
  // entirely rather than writing an empty array.
  if (milestones && milestones.length) goal.milestones = milestones;
  return goal;
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
