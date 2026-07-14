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

// --- CONFIDENCE (Phase 2a) ---
//
// Each component maps to the Phase-1 coverage keys it depends on: `fields`
// read profile.provided, `instruments` read baseline.answered. A component is
// "high" when every input was answered, "estimated" when none were (pure
// defaults), "partial" in between, and null when coverage was never captured
// (older saves) or the input isn't tracked. Aspect confidence is the same
// ratio over the union of its components' inputs — "answered / total".
export const COMPONENT_COVERAGE = {
  finance: {
    income: { fields: ["income"] },
    cfpb: { instruments: ["cfpb"] },
    savings: { fields: ["savingsRate"] }
  },
  physical: {
    activity: { fields: ["weeklyVigorousDays", "weeklyVigorousMins", "weeklyModerateDays", "weeklyModerateMins", "weeklyWalkingDays", "weeklyWalkingMins"] },
    body: { fields: ["weight", "height"] },
    sleep: { fields: ["sleepHours"], instruments: ["jss"] },
    nutrition: { fields: ["vegetablePortions", "waterLiters"] }
  },
  mental: {
    who5: { instruments: ["who5"] },
    st5: { instruments: ["st5"] }
  },
  relationships: {
    lsns: { instruments: ["lsns"] },
    ucla: { instruments: ["ucla"] },
    ras: { instruments: ["ras"] }
  },
  personalGoals: {
    gse: { instruments: ["gse"] },
    grit: { instruments: ["grit"] },
    learning: { fields: ["weeklyLearningHours", "digitalLiteracy"] }
  },
  socialContribution: {
    giving: { fields: ["monthlyDonations"] },
    volunteering: { fields: ["volunteeringHours"] },
    ptm: { instruments: ["ptm"] }
  },
  environment: {
    plastic: { fields: ["singleUsePlastics"] },
    geb: { instruments: ["geb"] }
  },
  humanityFuture: {
    skills: { fields: ["weeklyLearningHours"] },
    // "security" is a binary longTermInvestments toggle with no tracked
    // provided-flag, so it is intentionally uncounted (no coverage entry).
    lfis: { instruments: ["lfis"] }
  }
};

// One input's coverage: true/false when known, null when the relevant map is
// absent (a save that never captured coverage → "unknown").
function inputAnswered(key, map) {
  if (!map || typeof map !== "object") return null;
  return map[key] === true;
}

function tierFrom(yes, total) {
  if (total === 0) return null;
  if (yes === total) return "high";
  if (yes === 0) return "estimated";
  return "partial";
}

// Known (non-null) coverage results for one component's inputs.
function componentCoverageResults(cov, provided, answered) {
  const results = [];
  for (const f of cov.fields || []) results.push(inputAnswered(f, provided));
  for (const i of cov.instruments || []) results.push(inputAnswered(i, answered));
  return results.filter(r => r !== null);
}

function componentConfidence(aspectKey, compKey, provided, answered) {
  const cov = (COMPONENT_COVERAGE[aspectKey] || {})[compKey];
  if (!cov) return null;
  const known = componentCoverageResults(cov, provided, answered);
  if (known.length === 0) return null;
  return tierFrom(known.filter(Boolean).length, known.length);
}

// Aspect-level tier: answered inputs / total inputs, deduped across components.
// RAS is skipped for single users (its component is never rendered for them).
export function getAspectConfidence(state, aspectKey) {
  const p = (state && state.profile) || {};
  const b = (state && state.baseline) || null;
  const provided = p.provided;
  const answered = b ? b.answered : null;
  const cov = COMPONENT_COVERAGE[aspectKey] || {};
  const seen = new Map(); // key -> answered? (dedupes inputs shared across components)
  for (const [compKey, entry] of Object.entries(cov)) {
    if (compKey === "ras" && p.relationshipStatus === "Single") continue;
    for (const f of entry.fields || []) {
      const r = inputAnswered(f, provided);
      if (r !== null) seen.set("f:" + f, r);
    }
    for (const i of entry.instruments || []) {
      const r = inputAnswered(i, answered);
      if (r !== null) seen.set("i:" + i, r);
    }
  }
  const yes = [...seen.values()].filter(Boolean).length;
  const result = { tier: tierFrom(yes, seen.size), answered: yes, total: seen.size };
  // A completed deep (long-form) section outranks every short-form tier: the
  // aspect has been measured with full validated instruments.
  if (isAspectDeepVerified(state, aspectKey)) {
    return { ...result, tier: "verified", verified: true };
  }
  return result;
}

// True once the user has completed this aspect's optional deep section.
export function isAspectDeepVerified(state, aspectKey) {
  return Boolean(state && state.baseline && state.baseline.deepDone && state.baseline.deepDone[aspectKey]);
}

// Extra component rows sourced from the deep (long-form) instruments, shown only
// once a deep section is completed. Each is flagged "verified" so the UI can
// mark it. Values are the deep instrument's normalized 0-100 sub-score.
function deepComponents(aspectKey, b) {
  const d = (b && b.deep) || null;
  if (!d) return [];
  const has = k => Number.isFinite(d[k]);
  const row = (key, label, value, detail) => ({ key, label, value: clamp100(value), detail, confidence: "verified" });
  switch (aspectKey) {
    case "finance":
      return has("cfpb10") ? [row("cfpb10", t("Financial well-being (CFPB-10)"), (d.cfpb10 / 40) * 100, tp("Full 10-item scale — raw {n}/40, linear scoring (not the official CFPB table)", { n: d.cfpb10 }))] : [];
    case "physical":
      return has("sedentary") ? [row("sedentary", t("Sedentary & sleep hygiene"), (d.sedentary / 12) * 100, tp("Sitting time + sleep habits — raw {n}/12", { n: d.sedentary }))] : [];
    case "mental":
      return has("pss10") ? [row("pss10", t("Perceived stress (PSS-10)"), 100 - (d.pss10 / 40) * 100, tp("Stress {n}/40, inverted (lower stress scores higher)", { n: d.pss10 }))] : [];
    case "relationships": {
      const rows = [];
      if (has("lsnsR")) rows.push(row("lsnsR", t("Social network (LSNS-R)"), (d.lsnsR / 60) * 100, tp("Full 12-item network scale — raw {n}/60", { n: d.lsnsR })));
      if (has("ras7")) rows.push(row("ras7", t("Relationship quality (RAS-7)"), ((d.ras7 - 7) / 28) * 100, tp("Full 7-item scale — raw {n}/35", { n: d.ras7 })));
      return rows;
    }
    case "personalGoals": {
      const rows = [];
      if (has("gse10")) rows.push(row("gse10", t("Self-efficacy (GSE-10)"), ((d.gse10 - 10) / 30) * 100, tp("Full 10-item scale — raw {n}/40", { n: d.gse10 })));
      if (has("grit12")) rows.push(row("grit12", t("Grit (12-item)"), ((d.grit12 - 12) / 48) * 100, tp("Full 12-item scale — raw {n}/60", { n: d.grit12 })));
      if (has("rses")) rows.push(row("rses", t("Self-esteem (Rosenberg)"), (d.rses / 30) * 100, tp("Rosenberg scale — raw {n}/30", { n: d.rses })));
      return rows;
    }
    case "socialContribution":
      return has("civicplus") ? [row("civicplus", t("Giving & civic habits"), (d.civicplus / 16) * 100, tp("Additional habits — raw {n}/16", { n: d.civicplus }))] : [];
    case "environment":
      return has("greenplus") ? [row("greenplus", t("Green habits (extended)"), (d.greenplus / 16) * 100, tp("Additional habits — raw {n}/16", { n: d.greenplus }))] : [];
    case "humanityFuture":
      return has("cfc12") ? [row("cfc12", t("Future orientation (CFC-12)"), ((d.cfc12 - 12) / 48) * 100, tp("Full 12-item scale — raw {n}/60", { n: d.cfc12 }))] : [];
    default:
      return [];
  }
}

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

// Same bands as state.js S_bmi (Asian BMI standard). Returns null when weight
// or height is missing so the caller can OMIT the component rather than show a
// fabricated "average" 50 that looks like a real measurement.
function bmiScore(p) {
  const w = parseFloat(p.weight || 0);
  const h = parseFloat(p.height || 0) / 100;
  if (!(w > 0 && h > 0)) return null;
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
    items.push({ key: "cfpb", label: t("Financial well-being (CFPB)"), value: clamp100(b.cfpb * 5), detail: tp("Raw {n}/20 — scored on a simple linear scale, not the CFPB's official score table", { n: b.cfpb }) });
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
    { key: "activity", label: t("Activity"), value: clamp100(activityScore(met)), detail: tp("{met} MET-min/week (WHO guideline 600)", { met: Math.round(met) }) }
  ];
  // Omit body composition entirely when weight/height are missing, rather than
  // reporting a made-up average that reads like a genuine measurement.
  const bmi = bmiScore(p);
  if (bmi !== null) {
    items.push({ key: "body", label: t("Body composition"), value: clamp100(bmi), detail: t("Asian BMI bands (18.5-22.9 ideal)") });
  }
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
    items.push({ key: "grit", label: t("Grit (perseverance)"), value: clamp100(((b.grit - 4) / 16) * 100), detail: tp("Perseverance facet only — {g}/5 vs the ~3.4 full-scale reference", { g: (b.grit / 4).toFixed(1) }) });
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
  // NOTE: `weeklyLearningHours` intentionally feeds both this "Future skills"
  // component and Personal Growth's "Active learning" — learning time is
  // genuinely evidence for both future-proofing and personal development. The
  // reuse is surfaced to the user in the detail line below so it is not silent.
  const items = [
    { key: "skills", label: t("Future skills"), value: clamp100(Math.min(100, (parseFloat(p.weeklyLearningHours || 0) / 4) * 100)), detail: tp("{h}h/week toward future-proof skills — reuses your weekly learning hours", { h: p.weeklyLearningHours || 0 }) },
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
  const provided = p.provided;
  const answered = b ? b.answered : null;
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

  // Annotate each component with its confidence tier (new object, no mutation).
  const shortComponents = componentsByAspect[aspectKey]().map(c => ({
    ...c,
    confidence: componentConfidence(aspectKey, c.key, provided, answered)
  }));
  // Deep (long-form) rows already carry their own "verified" confidence.
  const components = [...shortComponents, ...deepComponents(aspectKey, b)];

  return {
    key: aspectKey,
    label: t(ASPECT_META[aspectKey].label),
    blurb: t(ASPECT_META[aspectKey].blurb),
    score: (state.aspects || {})[aspectKey] ?? 0,
    benchmark,
    confidence: getAspectConfidence(state, aspectKey),
    components,
    trend: (state.snapshots || []).map(s => ({
      date: s.date,
      value: clamp100((s.aspects || {})[aspectKey] ?? 0)
    }))
  };
}
