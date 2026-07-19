// defaults.js - The canonical empty state and starter goals.
//
// Kept apart from the manager (finding #13) so modules that only need the
// SHAPE of the state — the import sanitizers, tests, future migrations — can
// read it without pulling in storage or scoring.

export const DEFAULT_STATE = {
  onboarded: false,
  schemaVersion: 4,
  profile: {
    name: "Guest",
    level: 1,
    xp: 0,
    lifetimeXp: 0, // never-truncated total XP ever earned — drives shareable points (finding #11)
    rank: "Foundational",
    assessmentComplete: true, // false only after a quick-start (express) baseline

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
  history: [], // legacy pre-v4 action-log archive; nothing writes it anymore
  goals: [], // weekly quantity pledges {id, templateId, target, streak, lastResult}
  reviews: [], // weekly review records {date, week, inputs, shifts, goals, xp}
  snapshots: [], // weekly {date, aspects} records for trend charts
  baseline: null, // raw instrument sums from onboarding, for benchmark percentiles
  checkins: [], // monthly mini re-assessment records {date, sums, shifts}
  friends: [], // crewmates imported from Crew Codes {id, name, level, totalPoints, aspects, addedAt}
  lastExportAt: null // ISO date of the last backup export — drives the dashboard nudge
};

// Starter pledges live in goals.js (createDefaultPledges): they derive from
// GOAL_TEMPLATES, which pulls in scoring.js — and this module's whole point is
// that reading the state SHAPE never pulls in scoring or storage.
