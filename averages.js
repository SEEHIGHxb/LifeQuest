// averages.js - The "population average" reference scores for the radar overlay.
//
// The dashboard radar draws a dashed polygon of the score an AVERAGE person
// would get, next to the user's own polygon. There is no published "average
// Life Balance score", so the average is DERIVED: a reference person assembled
// from the cited population statistics below is run through the same eight
// calculators in scoring.js that score a real user. A hand-typed table would
// silently drift whenever a formula changed; computing it from the calculators
// keeps the overlay metric-coherent by construction (the scoring-integrity
// tests pin the normalizers underneath).
//
// Citation convention matches benchmarks.js: every input line names its
// source; lines with no published statistic are marked ASSUMPTION and lean on
// the app's own onboarding defaults or a scale midpoint.

import {
  calculateFinanceScore,
  calculatePhysicalScore,
  calculateMentalScore,
  calculateRelationshipsScore,
  calculatePersonalGoalsScore,
  calculateSocialContributionScore,
  calculateEnvironmentScore,
  calculateHumanityFutureScore
} from "./scoring.js";

// A median-ish Thai adult. Only the fields the calculators read are set.
const REFERENCE_PROFILE = {
  age: 35, // working-age adult, inside the CFPB 18-61 band (ASSUMPTION)
  region: "Provinces", // most Thais live outside Bangkok (NSO)
  relationshipStatus: "Single", // RAS has no population norm, so no romantic term is assumed
  income: 12900, // THB/mo — national median wage model in benchmarks.js (LFS/BOT)
  savingsRate: 10, // % — ASSUMPTION (app onboarding default)
  digitalLiteracy: 50, // self-rating midpoint — ASSUMPTION
  weeklyLearningHours: 2, // ASSUMPTION (app onboarding default)
  // ~1,220 MET-min/week: 71% of Thai adults exceed the 600 WHO guideline
  // (SPA 2012-2019), so the median sits comfortably above it.
  weeklyVigorousDays: 0,
  weeklyVigorousMins: 0,
  weeklyModerateDays: 3,
  weeklyModerateMins: 40,
  weeklyWalkingDays: 5,
  weeklyWalkingMins: 45,
  weight: 64, // kg
  height: 165, // cm -> BMI 23.5, low "overweight" Asian band (NHES: 37.5% of adults are >=25)
  sleepHours: 7, // recommended-range midpoint (ASSUMPTION)
  vegetablePortions: 2, // per day — ASSUMPTION (app onboarding default)
  waterLiters: 1.5, // per day — ASSUMPTION (app onboarding default)
  singleUsePlastics: 3, // per day — Thai average post-ban (same anchor as benchmarks.js)
  monthlyDonations: 100, // THB — 52% of Thais donate (CAF WGI); a modest median amount
  volunteeringHours: 0, // per month — 81% do not volunteer (CAF WGI)
  longTermInvestments: false // most Thai workers lack retirement savings (ILO/OECD coverage)
};

// Instrument answer arrays whose raw sums hit the published population means.
const REFERENCE_ANSWERS = {
  cfpb: [2, 2, 2, 2, 2], // raw 10 -> official score 50 (CFPB scale is centred near the US mean of ~50)
  jss: [2, 2, 1, 1], // raw 6 of 20 — occasional sleep complaints (ASSUMPTION)
  who5: [3, 3, 4, 3, 4], // raw 17 -> 68, the WHO-5 population mean of 67.56 (German norms)
  st5: [1, 1, 1, 0, 0], // raw 3 — inside the DMH "fine" band (<=4) where most respondents fall
  lsns: [3, 3, 3, 3, 3, 2], // raw 17 — community means run 16.1-17.9 (Lubben et al.)
  ucla: [2, 1, 1], // raw 4 — HRS population mean 3.89
  gse: [3, 3, 3, 3, 3, 3], // raw 18 — Scholz 25-country mean 2.955/item
  grit: [4, 3, 4, 3], // raw 14 — Duckworth samples average ~3.4/item
  ptm: [2, 2, 2, 2, 2], // app-authored items: scale midpoint (ASSUMPTION)
  geb: [2, 2, 2, 2, 2, 2], // app-authored items: scale midpoint (ASSUMPTION)
  lfis: [2, 2, 2, 2, 2] // app-authored items: scale midpoint (ASSUMPTION)
};

const R = REFERENCE_PROFILE;
const A = REFERENCE_ANSWERS;

// Expected values (pinned within ±15 by tests/averages.test.mjs): finance 55,
// physical 62, mental 69, relationships 70, personalGoals 59,
// socialContribution 32, environment 50, humanityFuture 44.
export const AVERAGE_ASPECT_SCORES = Object.freeze({
  finance: calculateFinanceScore(R, A.cfpb),
  physical: calculatePhysicalScore(R, A.jss),
  mental: calculateMentalScore(R, A.st5, A.who5),
  relationships: calculateRelationshipsScore(R, A.lsns, A.ucla, null),
  personalGoals: calculatePersonalGoalsScore(R, A.gse, A.grit),
  socialContribution: calculateSocialContributionScore(R, A.ptm),
  environment: calculateEnvironmentScore(R, A.geb),
  humanityFuture: calculateHumanityFutureScore(R, A.lfis)
});
