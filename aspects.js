// aspects.js - Per-aspect detail: sub-score components and trend series.
//
// Components mirror the onboarding scoring formulas in state.js but are
// computed from what the save actually stores (profile fields + baseline
// raw instrument sums), so they stay correct after re-loads. Components
// that need a survey baseline are omitted for saves made before it existed.

import { getAllBenchmarks } from "./benchmarks.js";
import { t, tp } from "./i18n.js";

export const ASPECT_KEYS = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

export const ASPECT_META = {
  finance: { label: "Finance", blurb: "Income standing, financial well-being, and savings habits." },
  physical: { label: "Physical", blurb: "Weekly activity, body composition, sleep, and nutrition." },
  mental: { label: "Mental", blurb: "Well-being (WHO-5) and stress resilience (Thai DMH ST-5)." },
  relationships: { label: "Relationships", blurb: "Social network strength, loneliness, and romantic satisfaction." },
  personalGoals: { label: "Personal Goals", blurb: "Self-efficacy, grit, and active learning habits." },
  socialContribution: { label: "Social Contribution", blurb: "Giving, volunteering, and prosocial habits." },
  environment: { label: "Environment", blurb: "Plastic footprint and everyday green behavior." },
  humanityFuture: { label: "Humanity's Future", blurb: "Future skills, long-term security, and future orientation." }
};

const clamp100 = v => Math.round(Math.max(0, Math.min(100, v)));

function metMinutes(p) {
  return (8.0 * (p.weeklyVigorousDays || 0) * (p.weeklyVigorousMins || 0))
    + (4.0 * (p.weeklyModerateDays || 0) * (p.weeklyModerateMins || 0))
    + (3.3 * (p.weeklyWalkingDays || 0) * (p.weeklyWalkingMins || 0));
}

// Same curve as state.js calculatePhysicalScore S_activity.
function activityScore(met) {
  if (met < 600) return (met / 600) * 40;
  if (met <= 3000) return 40 + ((met - 600) / 2400) * 40;
  return 80 + Math.min(20, ((met - 3000) / 3000) * 20);
}

// Same bands as state.js S_bmi (Asian BMI standard).
function bmiScore(p) {
  const w = parseFloat(p.weight || 0);
  const h = parseFloat(p.height || 0) / 100;
  if (!(w > 0 && h > 0)) return 50;
  const bmi = w / (h * h);
  if (bmi >= 18.5 && bmi <= 22.9) return 100;
  if (bmi >= 23.0 && bmi <= 24.9) return 75;
  if (bmi >= 25.0 && bmi <= 29.9) return 50;
  if (bmi >= 30.0) return 25;
  return Math.max(25, (bmi / 18.5) * 100);
}

// Same bands as state.js ST-5 stress factor (higher = calmer).
function stressResilience(st5Raw) {
  if (st5Raw <= 4) return 100 - st5Raw * 10;
  if (st5Raw <= 7) return 60 - (st5Raw - 4) * 10;
  if (st5Raw <= 9) return 30 - (st5Raw - 7) * 10;
  return 0;
}

// Same bands as state.js plastic factor.
function plasticScore(p) {
  const pieces = parseInt(p.singleUsePlastics || 0);
  if (pieces === 0) return 100;
  if (pieces <= 2) return 80;
  if (pieces <= 5) return 50;
  if (pieces <= 7) return 25;
  return 0;
}

function financeComponents(p, b, benchmark) {
  const items = [];
  if (benchmark) {
    items.push({ key: "income", label: t("Income standing"), value: benchmark.percentile, detail: t("Percentile vs Thai worker earnings (estimate)") });
  }
  if (b && Number.isFinite(b.cfpb)) {
    items.push({ key: "cfpb", label: t("Financial well-being (CFPB)"), value: clamp100(b.cfpb * 5), detail: tp("Raw {n}/20 at baseline", { n: b.cfpb }) });
  }
  items.push({
    key: "savings",
    label: t("Savings habit"),
    value: clamp100((parseFloat(p.savingsRate || 0) / 20) * 100),
    detail: tp("Saving {rate}% of income (20%+ maxes this)", { rate: p.savingsRate || 0 })
  });
  return items;
}

function physicalComponents(p, b) {
  const met = metMinutes(p);
  const items = [
    { key: "activity", label: t("Activity"), value: clamp100(activityScore(met)), detail: tp("{met} MET-min/week (WHO guideline 600)", { met: Math.round(met) }) },
    { key: "body", label: t("Body composition"), value: clamp100(bmiScore(p)), detail: t("Asian BMI bands (18.5-22.9 ideal)") }
  ];
  const duration = parseFloat(p.sleepHours || 0);
  const durationScore = duration >= 7 && duration <= 9 ? 100 : duration >= 6 && duration < 7 ? 75 : 50;
  if (b && Number.isFinite(b.jss)) {
    const quality = 100 - b.jss * 5;
    items.push({ key: "sleep", label: t("Sleep"), value: clamp100(0.5 * durationScore + 0.5 * quality), detail: tp("{h}h/night + baseline quality {jss}/20 issues", { h: duration, jss: b.jss }) });
  } else {
    items.push({ key: "sleep", label: t("Sleep duration"), value: clamp100(durationScore), detail: tp("{h}h/night (7-9h ideal)", { h: duration }) });
  }
  const veg = Math.min(100, (parseFloat(p.vegetablePortions || 0) / 5) * 100);
  const water = Math.min(100, (parseFloat(p.waterLiters || 0) / 2.5) * 100);
  items.push({ key: "nutrition", label: t("Nutrition"), value: clamp100(0.5 * veg + 0.5 * water), detail: tp("{veg} veg portions, {water}L water/day", { veg: p.vegetablePortions || 0, water: p.waterLiters || 0 }) });
  return items;
}

function mentalComponents(b) {
  if (!b) return [];
  const items = [];
  if (Number.isFinite(b.who5)) {
    items.push({ key: "who5", label: t("Well-being (WHO-5)"), value: clamp100(b.who5 * 4), detail: tp("Raw {n}/25 at baseline (scores under 50/100 suggest low mood)", { n: b.who5 }) });
  }
  if (Number.isFinite(b.st5)) {
    items.push({ key: "st5", label: t("Stress resilience (ST-5)"), value: clamp100(stressResilience(b.st5)), detail: tp("Stress {n}/15 — DMH bands: 0-4 fine, 5-6 watch, 7+ problem", { n: b.st5 }) });
  }
  return items;
}

function relationshipsComponents(p, b) {
  if (!b) return [];
  const items = [];
  if (Number.isFinite(b.lsns)) {
    items.push({ key: "lsns", label: t("Social network (LSNS-6)"), value: clamp100((b.lsns / 30) * 100), detail: tp("Raw {n}/30 (under 12 = isolation risk)", { n: b.lsns }) });
  }
  if (Number.isFinite(b.ucla)) {
    items.push({ key: "ucla", label: t("Low loneliness (UCLA-3)"), value: clamp100(100 - ((b.ucla - 3) / 6) * 100), detail: tp("Loneliness {n}/9, inverted (higher bar = less lonely)", { n: b.ucla }) });
  }
  if (p.relationshipStatus !== "Single" && Number.isFinite(b.ras) && b.ras !== null) {
    items.push({ key: "ras", label: t("Romantic satisfaction (RAS)"), value: clamp100(((b.ras - 3) / 12) * 100), detail: tp("Raw {n}/15 at baseline", { n: b.ras }) });
  }
  return items;
}

function personalGoalsComponents(p, b) {
  const items = [];
  if (b && Number.isFinite(b.gse)) {
    items.push({ key: "gse", label: t("Self-efficacy (GSE)"), value: clamp100(((b.gse - 6) / 18) * 100), detail: tp("Raw {n}/24 at baseline", { n: b.gse }) });
  }
  if (b && Number.isFinite(b.grit)) {
    items.push({ key: "grit", label: t("Grit"), value: clamp100(((b.grit - 4) / 16) * 100), detail: tp("{g}/5 vs the ~3.4 adult reference", { g: (b.grit / 4).toFixed(1) }) });
  }
  const study = Math.min(100, (parseFloat(p.weeklyLearningHours || 0) / 5) * 100);
  const digital = Math.max(0, Math.min(100, parseFloat(p.digitalLiteracy || 0)));
  items.push({ key: "learning", label: t("Active learning"), value: clamp100(0.5 * study + 0.5 * digital), detail: tp("{h}h/week study + digital skills {d}/100", { h: p.weeklyLearningHours || 0, d: digital }) });
  return items;
}

function socialContributionComponents(p, b) {
  const don = parseFloat(p.monthlyDonations || 0);
  const items = [
    { key: "giving", label: t("Giving"), value: clamp100(Math.min(100, (don / 500) * 100)), detail: tp("{thb} THB/month (500+ maxes this)", { thb: Math.round(don).toLocaleString() }) },
    { key: "volunteering", label: t("Volunteering"), value: clamp100(Math.min(100, (parseFloat(p.volunteeringHours || 0) / 4) * 100)), detail: tp("{h}h/month (4h+ maxes this)", { h: p.volunteeringHours || 0 }) }
  ];
  if (b && Number.isFinite(b.ptm)) {
    items.push({ key: "ptm", label: t("Prosocial habits (PTM)"), value: clamp100((b.ptm / 20) * 100), detail: tp("Raw {n}/20 at baseline", { n: b.ptm }) });
  }
  return items;
}

function environmentComponents(p, b) {
  const items = [
    { key: "plastic", label: t("Plastic reduction"), value: clamp100(plasticScore(p)), detail: tp("{n} single-use pieces/day (Thai avg ~3)", { n: p.singleUsePlastics || 0 }) }
  ];
  if (b && Number.isFinite(b.geb)) {
    items.push({ key: "geb", label: t("Green habits (GEB)"), value: clamp100((b.geb / 24) * 100), detail: tp("Raw {n}/24 at baseline", { n: b.geb }) });
  }
  return items;
}

function humanityFutureComponents(p, b) {
  const items = [
    { key: "skills", label: t("Future skills"), value: clamp100(Math.min(100, (parseFloat(p.weeklyLearningHours || 0) / 4) * 100)), detail: tp("{h}h/week toward future-proof skills", { h: p.weeklyLearningHours || 0 }) },
    { key: "security", label: t("Long-term security"), value: p.longTermInvestments ? 100 : 0, detail: p.longTermInvestments ? t("Holds retirement/long-term investments") : t("No retirement/long-term investments yet") }
  ];
  if (b && Number.isFinite(b.lfis)) {
    items.push({ key: "lfis", label: t("Future orientation (LFIS)"), value: clamp100((b.lfis / 20) * 100), detail: tp("Raw {n}/20 at baseline", { n: b.lfis }) });
  }
  return items;
}

// Full detail bundle for one aspect page.
export function getAspectDetail(state, aspectKey) {
  if (!ASPECT_KEYS.includes(aspectKey)) return null;
  const p = state.profile || {};
  const b = state.baseline || null;
  const benchmark = getAllBenchmarks(state)[aspectKey];

  const componentsByAspect = {
    finance: () => financeComponents(p, b, benchmark),
    physical: () => physicalComponents(p, b),
    mental: () => mentalComponents(b),
    relationships: () => relationshipsComponents(p, b),
    personalGoals: () => personalGoalsComponents(p, b),
    socialContribution: () => socialContributionComponents(p, b),
    environment: () => environmentComponents(p, b),
    humanityFuture: () => humanityFutureComponents(p, b)
  };

  return {
    key: aspectKey,
    label: t(ASPECT_META[aspectKey].label),
    blurb: t(ASPECT_META[aspectKey].blurb),
    score: (state.aspects || {})[aspectKey] ?? 0,
    benchmark,
    components: componentsByAspect[aspectKey](),
    trend: (state.snapshots || []).map(s => ({
      date: s.date,
      value: clamp100((s.aspects || {})[aspectKey] ?? 0)
    }))
  };
}
