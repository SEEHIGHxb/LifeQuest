// scoring.js - Pure scoring: instrument normalizers and the aspect calculators.
//
// Single source of truth (finding #13). Before this module the same formulas
// lived in three places — the onboarding calculators in state.js, the monthly
// check-in targets in submitCheckin, and the component breakdowns in aspects.js
// — with the ST-5 stress bands copied into all three. Any tweak had to be made
// three times or the score on the card would silently disagree with the formula
// behind it. Everything here is a pure function of (profile, answers): no
// storage, no DOM, no i18n.

import { incomePercentile } from "./benchmarks.js";

// Sum of an instrument's raw answer values ("" and null count as 0).
export function rawSum(answers) {
  return (answers || []).reduce((sum, val) => sum + parseInt(val || 0), 0);
}

export function clamp100(v) {
  return Math.round(Math.max(0, Math.min(100, v)));
}

// --- SHORT-INSTRUMENT NORMALIZERS (raw sum -> 0-100, higher = healthier) ---

// WHO-5 well-being (5 items, each 0-5, raw 0-25).
export function who5Score(raw) {
  return raw * 4;
}

// DMH Thailand ST-5 (5 items, each 0-3, raw 0-15) -> stress resilience
// (higher = calmer). Bands follow the DMH cutoffs: <=4 fine, 5-7 watch,
// 8-9 problem, 10+ severe.
export function st5Resilience(raw) {
  if (raw <= 4) return 100 - raw * 10;
  if (raw <= 7) return 60 - (raw - 4) * 10;
  if (raw <= 9) return 30 - (raw - 7) * 10;
  return 0;
}

// CFPB financial well-being, scored with the OFFICIAL conversion tables from
// the CFPB scoring worksheets ("Measuring financial well-being: A guide to
// using the CFPB Financial Well-Being Scale", Dec 2015, pp. 28 & 31):
// raw total -> IRT-scaled score, self-administered mode, by age band
// (18-61 vs 62+). Replaces the earlier linear approximation (finding #8).
// The official score does not span 0-100: the 5-item self-administered range
// is 19-82 (18-61) / 20-90 (62+), centred near the US mean of ~50.
const CFPB5_SELF = {
  younger: [19, 25, 29, 32, 36, 38, 41, 43, 46, 48, 50, 53, 55, 57, 60, 63, 65, 68, 72, 76, 82],
  older: [20, 26, 31, 34, 37, 40, 43, 46, 48, 51, 53, 55, 58, 61, 63, 66, 69, 73, 76, 81, 90]
};
const CFPB10_SELF = {
  younger: [14, 19, 22, 25, 27, 29, 31, 32, 34, 35, 37, 38, 40, 41, 42, 44, 45, 46, 47, 49, 50, 51, 52, 54, 55, 56, 58, 59, 60, 62, 63, 65, 66, 68, 69, 71, 73, 75, 78, 81, 86],
  older: [14, 20, 24, 26, 29, 31, 33, 35, 36, 38, 39, 41, 42, 44, 45, 46, 48, 49, 50, 52, 53, 54, 56, 57, 58, 60, 61, 63, 64, 66, 67, 69, 71, 73, 75, 77, 79, 82, 84, 88, 95]
};

function cfpbLookup(table, raw, age) {
  const band = parseFloat(age || 0) >= 62 ? table.older : table.younger;
  const idx = Math.max(0, Math.min(band.length - 1, Math.round(raw || 0)));
  return band[idx];
}

// CFPB-5 (5 items, each 0-4, raw 0-20) -> official Financial Well-Being score.
export function cfpbScore(raw, age) {
  return cfpbLookup(CFPB5_SELF, raw, age);
}

// CFPB-10 (10 items, each 0-4, raw 0-40) -> official Financial Well-Being score.
export function cfpb10Score(raw, age) {
  return cfpbLookup(CFPB10_SELF, raw, age);
}

// Sleep-quality issues (JSS, 4 items, each 0-5, raw 0-20), inverted.
export function sleepQualityScore(raw) {
  return 100 - raw * 5;
}

// LSNS-6 social network (6 items, each 0-5, raw 0-30; under 12 = isolation risk).
export function lsnsScore(raw) {
  return (raw / 30) * 100;
}

// UCLA-3 loneliness (3 items, each 1-3, raw 3-9), inverted so higher = less lonely.
export function uclaLowLoneliness(raw) {
  return 100 - ((raw - 3) / 6) * 100;
}

// RAS-3 romantic satisfaction (3 items, each 1-5, raw 3-15).
export function rasScore(raw) {
  return ((raw - 3) / 12) * 100;
}

// GSE-6 self-efficacy (6 items, each 1-4, raw 6-24).
export function gseScore(raw) {
  return ((raw - 6) / 18) * 100;
}

// Grit-S perseverance facet (4 items, each 1-5, raw 4-20).
export function gritScore(raw) {
  return ((raw - 4) / 16) * 100;
}

// --- PROFILE-DERIVED SUB-SCORES ---

// IPAQ MET-minutes/week from the weekly activity fields.
export function metMinutes(profile) {
  return (8.0 * (profile.weeklyVigorousDays || 0) * (profile.weeklyVigorousMins || 0))
    + (4.0 * (profile.weeklyModerateDays || 0) * (profile.weeklyModerateMins || 0))
    + (3.3 * (profile.weeklyWalkingDays || 0) * (profile.weeklyWalkingMins || 0));
}

// MET-minutes -> 0-100. WHO guideline (600) lands at 40; 3000+ approaches 100.
export function activityScore(met) {
  if (met < 600) return (met / 600) * 40;
  if (met <= 3000) return 40 + ((met - 600) / 2400) * 40;
  return 80 + Math.min(20, ((met - 3000) / 3000) * 20);
}

// Asian BMI bands. Returns null when weight or height is missing so callers
// OMIT the component rather than show a fabricated "average" 50 that looks
// like a real measurement (finding #7).
export function bmiScore(profile) {
  const w = parseFloat(profile.weight || 0);
  const h = parseFloat(profile.height || 0) / 100; // in meters
  if (!(w > 0 && h > 0)) return null;
  const bmi = w / (h * h);
  if (bmi >= 18.5 && bmi <= 22.9) return 100; // Ideal
  if (bmi >= 23.0 && bmi <= 24.9) return 75; // Overweight
  if (bmi >= 25.0 && bmi <= 29.9) return 50; // Obese Class 1
  if (bmi >= 30.0) return 25; // Obese Class 2
  return Math.max(25, (bmi / 18.5) * 100); // Underweight
}

// Single-use plastic pieces per DAY -> 0-100 (Thai average ~3/day post-ban).
export function plasticScore(profile) {
  const pieces = parseInt(profile.singleUsePlastics || 0);
  if (pieces === 0) return 100;
  if (pieces <= 2) return 80;
  if (pieces <= 5) return 50;
  if (pieces <= 7) return 25;
  return 0;
}

// Active learning: weekly study hours (5h maxes it) blended with self-rated
// digital literacy. Feeds Personal Goals.
export function learningScore(profile) {
  const study = Math.min(100, (parseFloat(profile.weeklyLearningHours || 0) / 5) * 100);
  const digital = Math.min(100, Math.max(0, parseFloat(profile.digitalLiteracy || 0)));
  return 0.5 * study + 0.5 * digital;
}

// Future-skills study time (4h/week maxes it — a stricter divisor than
// learningScore's 5h, deliberately: future-proofing expects more).
// NOTE: `weeklyLearningHours` intentionally feeds both this and learningScore —
// learning time is genuinely evidence for personal growth AND future-proofing.
// The reuse is surfaced to the user on the component detail line.
export function futureStudyScore(profile) {
  return Math.min(100, (parseFloat(profile.weeklyLearningHours || 0) / 4) * 100);
}

// Savings-rate bonus points on the finance score (a 20% rate maxes the +10).
export function savingsBonus(profile) {
  return Math.min(10, (parseFloat(profile.savingsRate || 0) / 20) * 10);
}

// Donation volume vs income, 0-100: 2% of income or 500 THB/mo maxes it.
export function donationVolumeFactor(profile) {
  const donRate = parseFloat(profile.monthlyDonations || 0);
  const donIncRatio = profile.income > 0 ? (donRate / profile.income) * 100 : 0;
  return donIncRatio >= 2 || donRate >= 500 ? 100 : Math.min(100, (donRate / 500) * 100);
}

// Volunteering hours per month, 0-100 (4h maxes it).
export function volunteerFactor(profile) {
  return Math.min(100, (parseFloat(profile.volunteeringHours || 0) / 4) * 100);
}

// --- COMPOSITES (unrounded, shared by onboarding scoring and the monthly
// check-in recalibration so the two can never drift apart) ---

// Mental: equal parts WHO-5 well-being and ST-5 stress resilience.
export function mentalComposite(who5Raw, st5Raw) {
  return 0.5 * who5Score(who5Raw) + 0.5 * st5Resilience(st5Raw);
}

// Relationships: rasRaw === null means "no romantic term" (single) and
// reweights to 0.5/0.5; otherwise 0.4 network / 0.3 loneliness / 0.3 romantic.
export function relationshipsComposite(lsnsRaw, uclaRaw, rasRaw) {
  const network = lsnsScore(lsnsRaw);
  const lowLoneliness = uclaLowLoneliness(uclaRaw);
  if (rasRaw === null || rasRaw === undefined) {
    return 0.5 * network + 0.5 * lowLoneliness;
  }
  return 0.4 * network + 0.3 * lowLoneliness + 0.3 * rasScore(rasRaw);
}

// Personal goals: self-efficacy, grit, and active learning habits.
export function personalGoalsComposite(profile, gseRaw, gritRaw) {
  return 0.4 * gseScore(gseRaw) + 0.3 * gritScore(gritRaw) + 0.3 * learningScore(profile);
}

// --- THE EIGHT ASPECT CALCULATORS (onboarding: answers -> 0-100 score) ---

export function calculateFinanceScore(profile, cfpbAnswers) {
  // 1. Subjective CFPB Well-Being Score (5 items, each 0-4, raw 0-20),
  //    converted with the official age-banded table.
  const S_wellbeing = cfpbScore(rawSum(cfpbAnswers), profile.age);

  // 2. Objective income standing — the SAME cited lognormal model as the
  //    finance benchmark card (single source of truth, finding #9), so the
  //    score and the on-page income percentile can no longer disagree.
  const S_income = incomePercentile(profile.income, profile.region);

  // Savings rate modifier (max 10 bonus points)
  return Math.round(Math.min(100, (0.6 * S_income) + (0.4 * S_wellbeing) + savingsBonus(profile)));
}

export function calculatePhysicalScore(profile, jssAnswers) {
  // 1. IPAQ MET-minutes -> activity curve
  const S_activity = activityScore(metMinutes(profile));

  // 2. Asian BMI Standard — OMITTED (not faked at 50) when weight/height are
  // missing. A fabricated "average" silently inflates or deflates the score;
  // instead its 0.2 weight is redistributed across the measured components.
  const S_bmi = bmiScore(profile);

  // 3. Sleep quality (4 items, each 0-5, raw 0-20)
  const F_quality = sleepQualityScore(rawSum(jssAnswers));

  // Duration folds in only when reported. A genuinely short night (< 6h) still
  // scores low, but an ABSENT duration no longer fabricates a floor of 50 —
  // sleep then reflects the measured quality alone.
  const duration = parseFloat(profile.sleepHours || 0);
  let S_sleep;
  if (duration > 0) {
    const F_duration = duration >= 7 && duration <= 9 ? 100 : (duration >= 6 && duration < 7 ? 75 : 50);
    S_sleep = (0.5 * F_duration) + (0.5 * F_quality);
  } else {
    S_sleep = F_quality;
  }

  // 4. Nutrition
  const portions = parseFloat(profile.vegetablePortions || 0);
  const F_veg = Math.min(100, (portions / 5) * 100);
  const liters = parseFloat(profile.waterLiters || 0);
  const F_water = Math.min(100, (liters / 2.5) * 100);
  const S_nutrition = (0.5 * F_veg) + (0.5 * F_water);

  // Weighted aggregate. A null component (BMI without measurements) drops out
  // and the surviving weights are renormalized, so nothing is ever imputed.
  const parts = [
    [0.4, S_activity],
    [0.2, S_bmi],
    [0.2, S_sleep],
    [0.2, S_nutrition]
  ].filter(([, value]) => value !== null);
  const totalWeight = parts.reduce((sum, [weight]) => sum + weight, 0);
  const weighted = parts.reduce((sum, [weight, value]) => sum + (weight * value), 0);
  return Math.round(weighted / totalWeight);
}

export function calculateMentalScore(profile, st5Answers, who5Answers) {
  return Math.round(mentalComposite(rawSum(who5Answers), rawSum(st5Answers)));
}

export function calculateRelationshipsScore(profile, lsnsAnswers, uclaAnswers, rasAnswers) {
  const lsnsRaw = rawSum(lsnsAnswers);
  const uclaRaw = rawSum(uclaAnswers);
  if (profile.relationshipStatus === "Single") {
    return Math.round(relationshipsComposite(lsnsRaw, uclaRaw, null));
  }
  // Coupled without RAS answers keeps the coupled weights with a zero romantic
  // term (raw 3 is the RAS scale floor, normalizing to 0) — the onboarding UI
  // always supplies RAS defaults for coupled users, so this path only guards
  // hostile or hand-edited input.
  return Math.round(relationshipsComposite(lsnsRaw, uclaRaw, rasAnswers ? rawSum(rasAnswers) : 3));
}

export function calculatePersonalGoalsScore(profile, gseAnswers, gritAnswers) {
  return Math.round(personalGoalsComposite(profile, rawSum(gseAnswers), rawSum(gritAnswers)));
}

export function calculateSocialContributionScore(profile, ptmAnswers) {
  // PTM Behavior (5 items, each 0-4)
  const qValues = ptmAnswers.map(v => parseInt(v || 0));

  // Donation Score
  const frequencyFactor = qValues[0] * 25; // max 100
  const S_donation = (0.5 * frequencyFactor) + (0.5 * donationVolumeFactor(profile));

  // Volunteering & Prosocial. Both PTM helping items count toward prosocial
  // behavior: Q2 "help friends/family in need" (previously collected but never
  // scored) and Q3 "help strangers".
  const prosocialFactor = ((qValues[1] + qValues[2]) / 8) * 100; // Q2 + Q3
  const S_action = (0.6 * volunteerFactor(profile)) + (0.4 * prosocialFactor);

  // Civic & Local (Q4 & Q5)
  const S_civic = ((qValues[3] + qValues[4]) / 8) * 100;

  return Math.round((0.4 * S_donation) + (0.4 * S_action) + (0.2 * S_civic));
}

export function calculateEnvironmentScore(profile, gebAnswers) {
  // GEB Scale (6 items, each 0-4)
  const qValues = gebAnswers.map(v => parseInt(v || 0));

  // Waste: plastic footprint + recycling (Q1) + single-use avoidance (Q2).
  // Q2 was previously collected but never scored.
  const S_waste = (0.5 * plasticScore(profile)) + (0.25 * (qValues[0] * 25)) + (0.25 * (qValues[1] * 25));

  // Transit (GEB Q3: public transit / walk / cycle frequency)
  const S_transit = qValues[2] * 25;

  // Conservation: energy habits (Q4 & Q5) + eco-product choices (Q6). Q6 was
  // previously collected but never scored.
  const S_conservation = ((qValues[3] + qValues[4] + qValues[5]) / 12) * 100;

  return Math.round((0.4 * S_waste) + (0.4 * S_transit) + (0.2 * S_conservation));
}

export function calculateHumanityFutureScore(profile, lfisAnswers) {
  // LFIS (5 items, each 0-4)
  const qValues = lfisAnswers.map(v => parseInt(v || 0));

  // Future Skills (see the futureStudyScore note on the shared learning hours)
  const Q1_val = qValues[0] * 25;
  const S_skills = (0.5 * futureStudyScore(profile)) + (0.5 * Q1_val);

  // Legacy (Q2)
  const S_legacy = qValues[1] * 25;

  // Risk / Philanthropy (Q3 & Q5)
  const S_philanthropy = ((qValues[2] + qValues[4]) / 8) * 100;

  // Security (Q4 & Pension)
  const pensionVal = profile.longTermInvestments ? 100 : 0;
  const Q4_val = qValues[3] * 25;
  const S_security = (0.5 * pensionVal) + (0.5 * Q4_val);

  return Math.round((0.25 * S_skills) + (0.25 * S_legacy) + (0.25 * S_philanthropy) + (0.25 * S_security));
}

// --- WEEKLY REVIEW (measured re-scoring) ---

// The per-aspect score deltas implied by a weekly review changing the measured
// profile fields, computed through the SAME formulas as onboarding so measured
// scores can never drift from the calculators above.
//
// Physical is fully re-measured (activity + sleep duration + nutrition all
// live in the weekly fields), so its delta is a whole-calculator difference —
// which also inherits the null-BMI weight renormalization for free. Every
// other aspect only has ONE OR TWO weekly inputs, so its delta is that
// component's change times its published weight chain. Deltas rather than
// overwrites: check-in and deep-assessment adjustments on the current score
// are preserved. mental/relationships have no weekly-measured inputs and are
// never shifted (sleep feeds physical, not mental).
//
// There is deliberately NO ±cap here: these are re-measurements through the
// same formulas onboarding runs uncapped, the inputs are range-validated, and
// each non-physical delta is structurally bounded by its weight product. The
// ±15 cap belongs to the survey re-assessment, where retake noise is real.
export function weeklyAspectShifts(oldProfile, newProfile, baseline) {
  const jss = [Number(baseline && baseline.jss) || 0];
  const deltas = {
    physical: calculatePhysicalScore(newProfile, jss) - calculatePhysicalScore(oldProfile, jss),
    finance: savingsBonus(newProfile) - savingsBonus(oldProfile),
    personalGoals: 0.3 * (learningScore(newProfile) - learningScore(oldProfile)),
    socialContribution:
      (0.4 * 0.5) * (donationVolumeFactor(newProfile) - donationVolumeFactor(oldProfile))
      + (0.4 * 0.6) * (volunteerFactor(newProfile) - volunteerFactor(oldProfile)),
    environment: (0.4 * 0.5) * (plasticScore(newProfile) - plasticScore(oldProfile)),
    humanityFuture: (0.25 * 0.5) * (futureStudyScore(newProfile) - futureStudyScore(oldProfile))
  };
  const shifts = {};
  for (const [aspect, delta] of Object.entries(deltas)) {
    const rounded = Math.round(delta);
    if (rounded !== 0) shifts[aspect] = rounded;
  }
  return shifts;
}

// The CFPB financial well-being table is age-banded (18-61 vs 62+), so a
// birthday that crosses 62 genuinely changes the finance score.
//
// Returned as a DELTA, never a recompute. The stored score carries every
// check-in and deep-assessment adjustment the user has accumulated; rebuilding
// it from the profile would silently discard all of them, and the user would
// see months of re-assessment vanish on a birthday with no explanation. Same
// reasoning, same shape as weeklyAspectShifts above.
//
// Wrapping the stored sum as [sum] is the established idiom here: rawSum of a
// one-element array is that element, so a stored total feeds a calculator that
// expects raw answers.
export function ageBandShifts(profile, oldAge, newAge, baseline) {
  const cfpb = [Number(baseline && baseline.cfpb) || 0];
  const delta = calculateFinanceScore({ ...profile, age: newAge }, cfpb)
    - calculateFinanceScore({ ...profile, age: oldAge }, cfpb);
  const rounded = Math.round(delta);
  return rounded === 0 ? {} : { finance: rounded };
}

// --- DEEP (LONG-FORM) INSTRUMENTS ---

// Deep raw sum -> 0-100. Shared by deepAspectScore below and the component
// rows in aspects.js, so the recalibration math and the bar on the page are
// the same formula by construction.
export const DEEP_NORM = {
  cfpb10: (v, age) => cfpb10Score(v, age), // CFPB-10, raw 0-40, official table
  sedentary: v => (v / 12) * 100, // sitting time + sleep hygiene, raw 0-12
  pss10: v => 100 - (v / 40) * 100, // PSS-10 stress raw 0-40, inverted
  lsnsR: v => (v / 60) * 100, // LSNS-R 12 items, raw 0-60
  ras7: v => ((v - 7) / 28) * 100, // RAS-7, raw 7-35
  gse10: v => ((v - 10) / 30) * 100, // GSE-10, raw 10-40
  grit12: v => ((v - 12) / 48) * 100, // Grit 12 items, raw 12-60
  rses: v => (v / 30) * 100, // Rosenberg self-esteem, raw 0-30
  civicplus: v => (v / 16) * 100, // extra giving/civic habits, raw 0-16
  greenplus: v => (v / 16) * 100, // extra green habits, raw 0-16
  cfc12: v => ((v - 12) / 48) * 100 // CFC-12 future orientation, raw 12-60
};

// Recompute one aspect from the deep instruments. Uses delta/blend forms that
// adjust the CURRENT score by the change the fuller instrument implies, so any
// logged drift or check-in shift is preserved. Returns null if the aspect's
// deep instruments aren't captured yet.
export function deepAspectScore(aspectKey, profile, baseline, currentScore) {
  const d = (baseline && baseline.deep) || null;
  if (!d) return null;
  const has = k => Number.isFinite(d[k]);
  const num = x => Number(x) || 0;

  switch (aspectKey) {
    case "finance": {
      // Swap CFPB-5 for CFPB-10 in the 0.4-weighted well-being term. Both
      // sides use the official tables so the delta is metric-coherent.
      if (!has("cfpb10")) return null;
      return clamp100(currentScore + 0.4 * (DEEP_NORM.cfpb10(d.cfpb10, profile.age) - cfpbScore(num(baseline.cfpb), profile.age)));
    }
    case "physical": {
      // Blend in sedentary/sleep-hygiene self-report at 15%.
      if (!has("sedentary")) return null;
      return clamp100(0.85 * currentScore + 0.15 * DEEP_NORM.sedentary(d.sedentary));
    }
    case "mental": {
      // Average the PSS-10 stress reading into the ST-5 stress half.
      if (!has("pss10")) return null;
      return clamp100(currentScore + 0.25 * (DEEP_NORM.pss10(d.pss10) - st5Resilience(num(baseline.st5))));
    }
    case "relationships": {
      // Swap LSNS-6 for LSNS-R, and (coupled) RAS-3 for RAS-7.
      let score = currentScore;
      if (has("lsnsR")) {
        const w = profile.relationshipStatus === "Single" ? 0.5 : 0.4;
        score += w * (DEEP_NORM.lsnsR(d.lsnsR) - lsnsScore(num(baseline.lsns)));
      }
      if (has("ras7") && profile.relationshipStatus !== "Single" && Number.isFinite(baseline.ras)) {
        score += 0.3 * (DEEP_NORM.ras7(d.ras7) - rasScore(num(baseline.ras)));
      }
      return clamp100(score);
    }
    case "personalGoals": {
      // Swap GSE-6->GSE-10 (w=0.4) and Grit-S->Grit-12 (w=0.3), then blend in
      // Rosenberg self-esteem at 15%.
      let score = currentScore;
      if (has("gse10")) score += 0.4 * (DEEP_NORM.gse10(d.gse10) - gseScore(num(baseline.gse)));
      if (has("grit12")) score += 0.3 * (DEEP_NORM.grit12(d.grit12) - gritScore(num(baseline.grit)));
      if (has("rses")) score = 0.85 * score + 0.15 * DEEP_NORM.rses(d.rses);
      return clamp100(score);
    }
    case "socialContribution": {
      if (!has("civicplus")) return null;
      return clamp100(0.8 * currentScore + 0.2 * DEEP_NORM.civicplus(d.civicplus));
    }
    case "environment": {
      if (!has("greenplus")) return null;
      return clamp100(0.8 * currentScore + 0.2 * DEEP_NORM.greenplus(d.greenplus));
    }
    case "humanityFuture": {
      // Blend in Consideration of Future Consequences at 20%.
      if (!has("cfc12")) return null;
      return clamp100(0.8 * currentScore + 0.2 * DEEP_NORM.cfc12(d.cfc12));
    }
    default:
      return null;
  }
}
