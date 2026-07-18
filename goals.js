// goals.js - Weekly pledge templates and grading (pure: no storage, no DOM).
//
// Since the weekly-review redesign, goals are QUANTITY pledges graded against
// the measured profile fields the weekly review writes ("average at least 2 L
// of water a day"), not counts of logged actions. Everything user-facing about
// a pledge (title, description, unit) derives from its template at render
// time — nothing user-authored is stored, which keeps the XSS surface at zero
// and every string translatable. XP is fixed per template so a self-set target
// cannot farm points.

import { metMinutes } from "./scoring.js";

// field: the profile field graded, or an "@derived" metric computed below.
// cmp:   "gte" (reach at least the target) or "lte" (stay at or under it).
// def/min/max/step bound the user-set target in the pledge form.
export const GOAL_TEMPLATES = {
  water: {
    field: "waterLiters", cmp: "gte", unit: "L/day",
    def: 2, min: 0.5, max: 5, step: 0.1, aspect: "physical", xp: 25,
    title: "Hydration pledge",
    desc: "Average at least {target} L of water per day."
  },
  sleep: {
    field: "sleepHours", cmp: "gte", unit: "hours/night",
    def: 7, min: 5, max: 10, step: 0.5, aspect: "physical", xp: 25,
    title: "Sleep pledge",
    desc: "Average at least {target} hours of sleep per night."
  },
  veg: {
    field: "vegetablePortions", cmp: "gte", unit: "portions/day",
    def: 3, min: 1, max: 10, step: 0.5, aspect: "physical", xp: 25,
    title: "Vegetables pledge",
    desc: "Average at least {target} vegetable portions per day."
  },
  exerciseDays: {
    field: "@exerciseDays", cmp: "gte", unit: "days/week",
    def: 3, min: 1, max: 7, step: 1, aspect: "physical", xp: 30,
    title: "Exercise days pledge",
    desc: "Exercise (vigorous or moderate) on at least {target} days this week."
  },
  metMinutes: {
    field: "@metMinutes", cmp: "gte", unit: "MET-min/week",
    def: 600, min: 300, max: 3000, step: 50, aspect: "physical", xp: 40,
    title: "Activity volume pledge",
    desc: "Reach at least {target} MET-minutes of activity this week (600 meets the WHO guideline)."
  },
  learning: {
    field: "weeklyLearningHours", cmp: "gte", unit: "hours/week",
    def: 3, min: 1, max: 40, step: 0.5, aspect: "personalGoals", xp: 25,
    title: "Learning pledge",
    desc: "Spend at least {target} hours on active learning this week."
  },
  plastics: {
    field: "singleUsePlastics", cmp: "lte", unit: "pieces/day",
    def: 2, min: 0, max: 10, step: 1, aspect: "environment", xp: 25,
    title: "Plastics pledge",
    desc: "Keep single-use plastics to at most {target} pieces per day."
  },
  savings: {
    field: "savingsRate", cmp: "gte", unit: "% of income",
    def: 10, min: 1, max: 80, step: 1, aspect: "finance", xp: 25,
    title: "Savings pledge",
    desc: "Keep your savings rate at or above {target}% of income."
  },
  donations: {
    field: "monthlyDonations", cmp: "gte", unit: "THB/month",
    def: 100, min: 20, max: 100000, step: 10, aspect: "socialContribution", xp: 25,
    title: "Giving pledge",
    desc: "Donate at least {target} THB this month."
  },
  volunteering: {
    field: "volunteeringHours", cmp: "gte", unit: "hours/month",
    def: 2, min: 1, max: 60, step: 0.5, aspect: "socialContribution", xp: 30,
    title: "Volunteering pledge",
    desc: "Volunteer at least {target} hours this month."
  }
};

// Metrics graded from a combination of profile fields rather than one field.
export const DERIVED_METRICS = {
  "@exerciseDays": p => Math.min(7, (parseInt(p.weeklyVigorousDays) || 0) + (parseInt(p.weeklyModerateDays) || 0)),
  "@metMinutes": p => Math.round(metMinutes(p))
};

export const PLEDGE_LIMIT = 6;

// The profile fields the weekly review form asks for and writes back. The
// slow-moving fields (income, weight/height, digital literacy, pension flag)
// deliberately stay onboarding/re-assessment concerns.
export const WEEKLY_REVIEW_FIELDS = [
  "weeklyVigorousDays", "weeklyVigorousMins",
  "weeklyModerateDays", "weeklyModerateMins",
  "weeklyWalkingDays", "weeklyWalkingMins",
  "sleepHours", "waterLiters", "vegetablePortions",
  "weeklyLearningHours", "singleUsePlastics", "savingsRate",
  "monthlyDonations", "volunteeringHours"
];

// Prototype-safe template lookup: a hostile templateId like "constructor"
// must resolve to null, not to something inherited from Object.prototype.
export function goalTemplate(templateId) {
  return typeof templateId === "string" && Object.hasOwn(GOAL_TEMPLATES, templateId)
    ? GOAL_TEMPLATES[templateId]
    : null;
}

// The measured value a pledge template reads from the current profile,
// rounded to one decimal for display and grading alike.
export function pledgeMetricValue(templateId, profile) {
  const tmpl = goalTemplate(templateId);
  if (!tmpl) return 0;
  const raw = tmpl.field.startsWith("@")
    ? DERIVED_METRICS[tmpl.field](profile)
    : parseFloat(profile[tmpl.field] || 0);
  return Math.round(raw * 10) / 10;
}

export function gradeGoal(goal, profile) {
  const tmpl = goalTemplate(goal.templateId);
  if (!tmpl) return { value: 0, met: false };
  const value = pledgeMetricValue(goal.templateId, profile);
  const met = tmpl.cmp === "lte" ? value <= goal.target : value >= goal.target;
  return { value, met };
}

// Clamp a requested target into the template's bounds (one-decimal precision).
export function clampPledgeTarget(templateId, target) {
  const tmpl = goalTemplate(templateId);
  if (!tmpl) return null;
  const n = Number(target);
  const clamped = Number.isFinite(n) ? Math.max(tmpl.min, Math.min(tmpl.max, n)) : tmpl.def;
  return Math.round(clamped * 10) / 10;
}

export function createPledge(templateId, target) {
  if (!goalTemplate(templateId)) return null;
  return {
    id: "goal_" + crypto.randomUUID().slice(0, 8),
    templateId,
    target: clampPledgeTarget(templateId, target),
    streak: 0,
    lastResult: null
  };
}

// Starter pledges for a fresh onboarding. Fresh objects every call — pledges
// are mutated in place as results land.
export function createDefaultPledges() {
  return [
    createPledge("water", 2),
    createPledge("exerciseDays", 3),
    createPledge("sleep", 7)
  ];
}
