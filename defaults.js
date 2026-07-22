// defaults.js - The canonical empty state and starter goals.
//
// Kept apart from the manager (finding #13) so modules that only need the
// SHAPE of the state — the import sanitizers, tests, future migrations — can
// read it without pulling in storage or scoring.

export const DEFAULT_STATE = {
  onboarded: false,
  schemaVersion: 5,
  profile: {
    name: "Guest",
    // Level IS the user's age — a fact about the person, not a claim about
    // them. XP no longer causes level-ups; birthdays do. See the plan's "Why":
    // every developmental-stage instrument needs a trained human rater, and ego
    // stages are empirically reversible, so a monotonic earned Level would be
    // asserting something the measurement cannot support.
    level: 1, // replaced by the real age at onboarding / migration
    lifetimeXp: 0, // never-truncated total XP ever earned (finding #11)
    assessmentComplete: true, // false only after a quick-start (express) baseline

    // Month + day only, NOT a full date of birth: enough to drive level-ups,
    // while never holding the identifier a full DOB would be. Null until asked.
    birthMonth: null, // 1-12
    birthDay: null, // 1-31
    // Whether the soft dashboard ask has been answered or waved off. Additive
    // with a safe default, so no schemaVersion bump: mergeSavedState spreads
    // defaults beneath the save, and an older save simply arrives as false.
    birthdayPromptDismissed: false,
    // Set when a birthday advances the level; birthday processing counts
    // elapsed birthdays from here, so a backup imported after two birthdays
    // levels up twice instead of losing a year.
    lastLevelUp: null, // { date: ISO, lifetimeXpAt: n }
    // The current level-year ("season"). XP is unlimited within a season and
    // resets at level-up — the archived seasons in state.levelYears are what
    // make the reset read as "filed", not "wiped".
    season: {
      startDate: null,
      earnedXp: 0,
      possibleXp: 0, // accrues per elapsed ISO week whether or not a review was submitted
      lastAccrualWeek: null // ISO week key, e.g. "2026-W30"
    },

    age: 25,
    gender: "unspecified", // male, female, unspecified — for benchmark norm selection
    region: "Provinces", // Provinces or Bangkok
    employment: "Office Worker", // Office Worker, Freelancer, Business Owner, Unemployed, Student
    relationshipStatus: "Single", // Single, Coupled
    income: 15000,
    savingsRate: 10,
    digitalLiteracy: 50,
    weeklyLearningHours: 2,
    weeklyVigorousDays: 0,
    weeklyVigorousMins: 0,
    weeklyModerateDays: 0,
    weeklyModerateMins: 0,
    weeklyWalkingDays: 3,
    weeklyWalkingMins: 20,
    weight: 60,
    height: 170,
    sleepHours: 7,
    vegetablePortions: 2,
    waterLiters: 1.5,
    singleUsePlastics: 3, // per DAY — scoring bands and the Thai-average benchmark are daily
    monthlyDonations: 0,
    volunteeringHours: 0,
    longTermInvestments: false
  },
  aspects: {
    finance: 0,
    physical: 0,
    mental: 0,
    relationships: 0,
    personalGoals: 0,
    socialContribution: 0,
    environment: 0,
    humanityFuture: 0
  },
  levelYears: [], // archived seasons {level, xp, possible, ratio} — the level-up trend
  history: [], // legacy pre-v4 action-log archive; nothing writes it anymore
  goals: [], // weekly quantity pledges {id, templateId, target, streak, lastResult}
  reviews: [], // weekly review records {date, week, inputs, shifts, goals, xp}
  snapshots: [], // weekly {date, aspects} records for trend charts
  baseline: null, // raw instrument sums from onboarding, for benchmark percentiles
  checkins: [], // monthly mini re-assessment records {date, sums, shifts}
  friends: [], // participants imported from Comparison Codes {id, name, aspects, addedAt}
  lastExportAt: null // ISO date of the last backup export — drives the dashboard nudge
};

// Starter pledges live in goals.js (createDefaultPledges): they derive from
// GOAL_TEMPLATES, which pulls in scoring.js — and this module's whole point is
// that reading the state SHAPE never pulls in scoring or storage.
