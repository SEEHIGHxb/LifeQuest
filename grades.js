// grades.js - Letter grades per aspect, and the Balance Index.
//
// Two derived readings, both computed from numbers the app already produces:
//
//   GRADE         a letter (A-F) for one aspect, derived from that aspect's
//                 PERCENTILE — the cited population comparison in
//                 benchmarks.js — never from the raw 0-100 score. The score is
//                 an app-internal composite; the percentile is the part that
//                 means something about a person, so it is the only honest
//                 thing to grade. Personal pages only: grades are deliberately
//                 absent from the comparison board and the shareable code.
//
//   BALANCE INDEX the HARMONIC mean of the eight aspect scores. This is the
//                 app's OWN derived construct — not an instrument, not a cited
//                 measure, and it must be described that way wherever it is
//                 shown (see views/methodology.js).
//
// Pure module: no DOM, no storage, no i18n. Canonical English labels live here
// (same convention as PERCENTILE_BANDS in benchmarks.js) so the bands stay
// unit-testable without a DOM; the UI localizes them with t().

import { ASPECT_KEYS } from "./aspects.js";
import { AVERAGE_ASPECT_SCORES } from "./averages.js";

// Cutoffs are percentile floors, so a grade always has a plain-language
// reading: A = top decile, F = bottom decile. The wide C band (30-69) is
// intentional — most people are typical, and a scale that hands out D's to the
// 35th percentile would be telling a lie about an ordinary life.
export const GRADE_BANDS = [
  { min: 90, grade: "A", label: "Top 10%" },
  { min: 70, grade: "B", label: "Top 30%" },
  { min: 30, grade: "C", label: "Typical range" },
  { min: 10, grade: "D", label: "Below typical" },
  { min: 0, grade: "F", label: "Bottom 10%" }
];

// Ordering weight for "which aspect needs attention first" (Phase 4 pledge
// suggestions). Not a scoring weight — the Balance Index does NOT consult it.
// B outranks A only so a perfect aspect never displaces a merely strong one.
export const GRADE_PRIORITY = { F: 5, D: 4, C: 2, B: 1, A: 0 };

// Harmonic mean is undefined at 0 and explodes near it, so each score is
// floored at 1. A user sitting at a true 0 still reads as ~1, which is the
// honest signal anyway: one collapsed aspect should dominate a BALANCE score.
const MIN_SCORE = 1;

export function gradeForPercentile(percentile) {
  if (!Number.isFinite(percentile)) return null;
  const band = GRADE_BANDS.find(b => percentile >= b.min)
    || GRADE_BANDS[GRADE_BANDS.length - 1];
  return { grade: band.grade, label: band.label, percentile };
}

// Grade for one benchmark, or null when the aspect has no benchmark yet.
// mentalBenchmark, relationshipsBenchmark and personalGoalsBenchmark all
// return null until the baseline instruments have been answered. Callers MUST
// render that as "not yet graded" and prompt for the assessment — falling back
// to the raw score would grade three aspects on a different basis from the
// other five, which is exactly the incoherence the percentile basis avoids.
export function gradeForBenchmark(benchmark) {
  if (!benchmark || !Number.isFinite(benchmark.percentile)) return null;
  return gradeForPercentile(benchmark.percentile);
}

// {aspectKey: grade|null} for a whole benchmark set.
export function gradeAllAspects(benchmarks) {
  const out = {};
  for (const key of ASPECT_KEYS) {
    out[key] = gradeForBenchmark((benchmarks || {})[key]);
  }
  return out;
}

// True when a grade is the bottom decile — the trigger for duty-of-care
// handling on `mental`. Kept as a named predicate rather than an inline
// `=== "F"` so the rule is greppable from the views that must honor it.
export function isBottomGrade(grade) {
  return !!grade && grade.grade === "F";
}

// Rescale one raw aspect score against its population average so the average
// person always sits at 50. The transform is piecewise-linear through three
// fixed points — (0 → 0), (populationAverage → 50), (100 → 100) — so every
// aspect's whole range stays reachable and "typical" reads as 50 no matter how
// high or low the population sits on that aspect.
//
// This is what makes the Balance Index POPULATION-RELATIVE, and coherent with
// the percentile-based grades: an aspect the whole population scores low on
// (social contribution averages ~32) no longer structurally anchors everyone's
// index down — being typical there counts as 50, not 32. Falls back to the raw
// score when no average is known for the key, keeping the function total.
export function relativeToPopulation(rawScore, avg) {
  const s = Math.max(0, Math.min(100, Number.isFinite(rawScore) ? rawScore : 0));
  if (!Number.isFinite(avg) || avg <= 0 || avg >= 100) return s;
  return s <= avg ? (50 * s) / avg : 50 + (50 * (s - avg)) / (100 - avg);
}

// BALANCE INDEX — harmonic mean of the eight aspects' POPULATION-RELATIVE
// standings (each raw score first passed through relativeToPopulation, so 50 is
// the average person and each aspect is equally reachable).
//
// Harmonic (not arithmetic) mean because this app is about balance: at an
// identical mean of 70, eight 70s and "seven ~79s plus a 10" differ (70 vs 42)
// because the harmonic mean is dominated by the smallest term. It rewards
// lifting a neglected aspect far more than polishing a strong one and cannot be
// gamed by grinding whichever aspect is cheapest. Taking the mean over the
// population-relative standings means "neglected" is judged against what is
// normal for each aspect, not against a flat 0-100 scale that some aspects can
// never realistically top.
//
// It is NOT a validated construct and no source proposes it; it is this app's
// own aggregate, and the methodology page says so.
export function balanceIndex(aspects) {
  const scores = ASPECT_KEYS.map(key => {
    const rel = relativeToPopulation((aspects || {})[key], AVERAGE_ASPECT_SCORES[key]);
    return Math.max(MIN_SCORE, Math.min(100, rel));
  });
  const reciprocalSum = scores.reduce((sum, v) => sum + 1 / v, 0);
  return Math.round(scores.length / reciprocalSum);
}

// Plain-language band for a Balance Index, for the personal-page caption and
// the comparison board tier. Same canonical-English convention as GRADE_BANDS.
// Thresholds sit on the population-relative scale where 50 is the average
// person, so an all-average life reads "Steady", never "Uneven" — you drop to
// "Uneven"/"Strained" only when an aspect falls below what is typical for it.
export const BALANCE_BANDS = [
  { min: 75, key: "strong", label: "Strong balance" },
  { min: 50, key: "steady", label: "Steady balance" },
  { min: 30, key: "uneven", label: "Uneven balance" },
  { min: 0, key: "strained", label: "Strained balance" }
];

export function balanceBand(index) {
  return BALANCE_BANDS.find(b => index >= b.min) || BALANCE_BANDS[BALANCE_BANDS.length - 1];
}

// The aspect dragging the Balance Index down hardest — the single largest
// contributor to the reciprocal sum, i.e. the lowest POPULATION-RELATIVE
// standing (the aspect furthest below what is typical for it, not merely the
// lowest raw score). Drives the "lift this first" line. `score` is the relative
// standing (0-100, 50 = average), matching the index it explains.
export function weakestAspect(aspects) {
  let worstKey = null;
  let worstValue = Infinity;
  for (const key of ASPECT_KEYS) {
    const rel = relativeToPopulation((aspects || {})[key], AVERAGE_ASPECT_SCORES[key]);
    if (rel < worstValue) {
      worstValue = rel;
      worstKey = key;
    }
  }
  return worstKey ? { aspect: worstKey, score: worstValue } : null;
}
