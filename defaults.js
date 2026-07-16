// defaults.js - The canonical empty state and starter goals.
//
// Kept apart from the manager (finding #13) so modules that only need the
// SHAPE of the state — the import sanitizers, tests, future migrations — can
// read it without pulling in storage or scoring.

export const DEFAULT_STATE = {
  onboarded: false,
  schemaVersion: 3,
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
  history: [],
  goals: [],
  customActions: [],
  dailyLimits: {},
  questResets: { daily: "", weekly: "" },
  snapshots: [], // weekly {date, aspects} records for trend charts
  baseline: null, // raw instrument sums from onboarding, for benchmark percentiles
  commitment: null, // active weekly aspect pledge {aspect, weeklyTarget, week, progress, completed}
  checkins: [], // monthly mini re-assessment records {date, sums, shifts}
  friends: [], // crewmates imported from Crew Codes {id, name, level, totalPoints, aspects, addedAt}
  lastExportAt: null // ISO date of the last backup export — drives the dashboard nudge
};

// Fresh copies every call: goals are mutated in place as they progress, so a
// shared constant would leak one user's progress into the "defaults".
export function createDefaultQuests() {
  return [
    {
      id: "daily_water",
      title: "Stay Hydrated",
      description: "Log your 2L+ hydration once today.",
      aspect: "physical",
      type: "daily",
      actionIds: ["drink_water"],
      targetValue: 1,
      currentValue: 0,
      xpReward: 15,
      completed: false
    },
    {
      id: "daily_sigh",
      title: "Breath Control",
      description: "Log 3 physiological sighs to reset stress.",
      aspect: "mental",
      type: "daily",
      actionIds: ["phys_sigh"],
      targetValue: 3,
      currentValue: 0,
      xpReward: 10,
      completed: false
    },
    {
      id: "weekly_workout",
      title: "Active Core",
      description: "Log at least 3 exercise sessions this week.",
      aspect: "physical",
      type: "weekly",
      actionIds: ["workout"],
      targetValue: 3,
      currentValue: 0,
      xpReward: 50,
      completed: false
    },
    {
      id: "epic_savings",
      title: "Safety Deposit",
      description: "Log a savings deposit 10 times.",
      aspect: "finance",
      type: "epic",
      actionIds: ["save_money"],
      targetValue: 10,
      currentValue: 0,
      xpReward: 150,
      completed: false,
      milestones: [
        { text: "3 deposits logged", at: 3, completed: false },
        { text: "6 deposits logged", at: 6, completed: false },
        { text: "10 deposits logged", at: 10, completed: false }
      ]
    }
  ];
}
