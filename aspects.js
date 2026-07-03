// aspects.js - Per-aspect detail: sub-score components and trend series.
//
// Components mirror the onboarding scoring formulas in state.js but are
// computed from what the save actually stores (profile fields + baseline
// raw instrument sums), so they stay correct after re-loads. Components
// that need a survey baseline are omitted for saves made before it existed.

import { getAllBenchmarks } from "./benchmarks.js";

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
    items.push({ label: "Income standing", value: benchmark.percentile, detail: "Percentile vs Thai worker earnings (estimate)" });
  }
  if (b && Number.isFinite(b.cfpb)) {
    items.push({ label: "Financial well-being (CFPB)", value: clamp100(b.cfpb * 5), detail: `Raw ${b.cfpb}/20 at baseline` });
  }
  items.push({
    label: "Savings habit",
    value: clamp100((parseFloat(p.savingsRate || 0) / 20) * 100),
    detail: `Saving ${p.savingsRate || 0}% of income (20%+ maxes this)`
  });
  return items;
}

function physicalComponents(p, b) {
  const met = metMinutes(p);
  const items = [
    { label: "Activity", value: clamp100(activityScore(met)), detail: `${Math.round(met)} MET-min/week (WHO guideline 600)` },
    { label: "Body composition", value: clamp100(bmiScore(p)), detail: "Asian BMI bands (18.5-22.9 ideal)" }
  ];
  const duration = parseFloat(p.sleepHours || 0);
  const durationScore = duration >= 7 && duration <= 9 ? 100 : duration >= 6 && duration < 7 ? 75 : 50;
  if (b && Number.isFinite(b.jss)) {
    const quality = 100 - b.jss * 5;
    items.push({ label: "Sleep", value: clamp100(0.5 * durationScore + 0.5 * quality), detail: `${duration}h/night + baseline quality ${b.jss}/20 issues` });
  } else {
    items.push({ label: "Sleep duration", value: clamp100(durationScore), detail: `${duration}h/night (7-9h ideal)` });
  }
  const veg = Math.min(100, (parseFloat(p.vegetablePortions || 0) / 5) * 100);
  const water = Math.min(100, (parseFloat(p.waterLiters || 0) / 2.5) * 100);
  items.push({ label: "Nutrition", value: clamp100(0.5 * veg + 0.5 * water), detail: `${p.vegetablePortions || 0} veg portions, ${p.waterLiters || 0}L water/day` });
  return items;
}

function mentalComponents(b) {
  if (!b) return [];
  const items = [];
  if (Number.isFinite(b.who5)) {
    items.push({ label: "Well-being (WHO-5)", value: clamp100(b.who5 * 4), detail: `Raw ${b.who5}/25 at baseline (scores under 50/100 suggest low mood)` });
  }
  if (Number.isFinite(b.st5)) {
    items.push({ label: "Stress resilience (ST-5)", value: clamp100(stressResilience(b.st5)), detail: `Stress ${b.st5}/15 — DMH bands: 0-4 fine, 5-6 watch, 7+ problem` });
  }
  return items;
}

function relationshipsComponents(p, b) {
  if (!b) return [];
  const items = [];
  if (Number.isFinite(b.lsns)) {
    items.push({ label: "Social network (LSNS-6)", value: clamp100((b.lsns / 30) * 100), detail: `Raw ${b.lsns}/30 (under 12 = isolation risk)` });
  }
  if (Number.isFinite(b.ucla)) {
    items.push({ label: "Low loneliness (UCLA-3)", value: clamp100(100 - ((b.ucla - 3) / 6) * 100), detail: `Loneliness ${b.ucla}/9, inverted (higher bar = less lonely)` });
  }
  if (p.relationshipStatus !== "Single" && Number.isFinite(b.ras) && b.ras !== null) {
    items.push({ label: "Romantic satisfaction (RAS)", value: clamp100(((b.ras - 3) / 12) * 100), detail: `Raw ${b.ras}/15 at baseline` });
  }
  return items;
}

function personalGoalsComponents(p, b) {
  const items = [];
  if (b && Number.isFinite(b.gse)) {
    items.push({ label: "Self-efficacy (GSE)", value: clamp100(((b.gse - 6) / 18) * 100), detail: `Raw ${b.gse}/24 at baseline` });
  }
  if (b && Number.isFinite(b.grit)) {
    items.push({ label: "Grit", value: clamp100(((b.grit - 4) / 16) * 100), detail: `${(b.grit / 4).toFixed(1)}/5 vs the ~3.4 adult reference` });
  }
  const study = Math.min(100, (parseFloat(p.weeklyLearningHours || 0) / 5) * 100);
  const digital = Math.max(0, Math.min(100, parseFloat(p.digitalLiteracy || 0)));
  items.push({ label: "Active learning", value: clamp100(0.5 * study + 0.5 * digital), detail: `${p.weeklyLearningHours || 0}h/week study + digital skills ${digital}/100` });
  return items;
}

function socialContributionComponents(p, b) {
  const don = parseFloat(p.monthlyDonations || 0);
  const items = [
    { label: "Giving", value: clamp100(Math.min(100, (don / 500) * 100)), detail: `${Math.round(don).toLocaleString()} THB/month (500+ maxes this)` },
    { label: "Volunteering", value: clamp100(Math.min(100, (parseFloat(p.volunteeringHours || 0) / 4) * 100)), detail: `${p.volunteeringHours || 0}h/month (4h+ maxes this)` }
  ];
  if (b && Number.isFinite(b.ptm)) {
    items.push({ label: "Prosocial habits (PTM)", value: clamp100((b.ptm / 20) * 100), detail: `Raw ${b.ptm}/20 at baseline` });
  }
  return items;
}

function environmentComponents(p, b) {
  const items = [
    { label: "Plastic reduction", value: clamp100(plasticScore(p)), detail: `${p.singleUsePlastics || 0} single-use pieces/day (Thai avg ~3)` }
  ];
  if (b && Number.isFinite(b.geb)) {
    items.push({ label: "Green habits (GEB)", value: clamp100((b.geb / 24) * 100), detail: `Raw ${b.geb}/24 at baseline` });
  }
  return items;
}

function humanityFutureComponents(p, b) {
  const items = [
    { label: "Future skills", value: clamp100(Math.min(100, (parseFloat(p.weeklyLearningHours || 0) / 4) * 100)), detail: `${p.weeklyLearningHours || 0}h/week toward future-proof skills` },
    { label: "Long-term security", value: p.longTermInvestments ? 100 : 0, detail: p.longTermInvestments ? "Holds retirement/long-term investments" : "No retirement/long-term investments yet" }
  ];
  if (b && Number.isFinite(b.lfis)) {
    items.push({ label: "Future orientation (LFIS)", value: clamp100((b.lfis / 20) * 100), detail: `Raw ${b.lfis}/20 at baseline` });
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
    label: ASPECT_META[aspectKey].label,
    blurb: ASPECT_META[aspectKey].blurb,
    score: (state.aspects || {})[aspectKey] ?? 0,
    benchmark,
    components: componentsByAspect[aspectKey](),
    trend: (state.snapshots || []).map(s => ({
      date: s.date,
      value: clamp100((s.aspects || {})[aspectKey] ?? 0)
    }))
  };
}
