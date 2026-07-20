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

// BALANCE INDEX — harmonic mean of the eight aspect scores.
//
// Chosen over the arithmetic mean because this app is about balance, and the
// arithmetic mean is indifferent to it: at an identical mean of 70, eight 70s
// and "seven ~79s plus a 10" score the same. The harmonic mean does not —
// 70 vs 42 — because it is dominated by the smallest term. That means it
// rewards lifting a neglected aspect far more than polishing a strong one,
// and it cannot be gamed by grinding whichever aspect is cheapest.
//
// It is NOT a validated construct and no source proposes it; it is this app's
// own aggregate, and the methodology page says so.
export function balanceIndex(aspects) {
  const scores = ASPECT_KEYS.map(key => {
    const raw = (aspects || {})[key];
    const value = Number.isFinite(raw) ? raw : 0;
    return Math.max(MIN_SCORE, Math.min(100, value));
  });
  const reciprocalSum = scores.reduce((sum, v) => sum + 1 / v, 0);
  return Math.round(scores.length / reciprocalSum);
}

// Plain-language band for a Balance Index, for the personal-page caption and
// (Phase 3) the comparison board tier. Same canonical-English convention as
// GRADE_BANDS.
export const BALANCE_BANDS = [
  { min: 80, key: "strong", label: "Strong balance" },
  { min: 60, key: "steady", label: "Steady balance" },
  { min: 40, key: "uneven", label: "Uneven balance" },
  { min: 0, key: "strained", label: "Strained balance" }
];

export function balanceBand(index) {
  return BALANCE_BANDS.find(b => index >= b.min) || BALANCE_BANDS[BALANCE_BANDS.length - 1];
}

// The aspect dragging the Balance Index down hardest — the single largest
// contributor to the reciprocal sum. Drives the "lift this first" line and,
// in Phase 4, pledge ordering.
export function weakestAspect(aspects) {
  let worstKey = null;
  let worstValue = Infinity;
  for (const key of ASPECT_KEYS) {
    const raw = (aspects || {})[key];
    const value = Number.isFinite(raw) ? raw : 0;
    if (value < worstValue) {
      worstValue = value;
      worstKey = key;
    }
  }
  return worstKey ? { aspect: worstKey, score: worstValue } : null;
}
