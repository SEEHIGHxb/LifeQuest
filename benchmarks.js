// benchmarks.js - Population reference points for each life aspect.
//
// Every figure below comes from a published source (verified 2026-07).
// Percentiles are honest approximations, never precision theater:
//   method "distribution" - normal approximation of a published mean/SD
//   method "threshold"    - placement against published participation rates
//   method "estimate"     - calibrated curve anchored to published figures
// The UI must always show the method and sources next to the number.
// Source labels stay in English on purpose: they are literature citations.

import { t, tp } from "./i18n.js";

const SOURCES = {
  nsoIncome: {
    label: "NSO Thailand, Household Socio-Economic Survey 2023 (avg. household income ~29,000 THB/mo national, ~39,100 Bangkok)",
    url: "https://www.nso.go.th/nsoweb/index?set_lang=en"
  },
  botWage: {
    label: "NSO Labour Force Survey via Bank of Thailand (avg. monthly wage ~15,972 THB, Q3 2025)",
    url: "https://app.bot.or.th/BTWS_STAT/statistics/BOTWEBSTAT.aspx?reportID=667&language=ENG"
  },
  thaiSpa: {
    label: "Thailand Surveillance on Physical Activity 2012-2019 (66.6-75.6% of adults meet the WHO activity guideline)",
    url: "https://bmcpublichealth.biomedcentral.com/articles/10.1186/s12889-021-10736-6"
  },
  nhesBmi: {
    label: "Thai National Health Examination Survey (2014: BMI >= 25 in 37.5% of adults; men 32.9%, women 41.8%)",
    url: "https://pubmed.ncbi.nlm.nih.gov/32493314/"
  },
  who5Norms: {
    label: "WHO-5 community norms, representative German sample 2025 (mean 67.6, SD 23.0 on 0-100)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12341540/"
  },
  st5Dmh: {
    label: "Srithanya Stress Test ST-5, Thai Dept. of Mental Health (<= 4 no problem, 5-6 possible problem, >= 7 problem)",
    url: "https://he01.tci-thaijo.org/index.php/jmht/article/view/1296"
  },
  ucla3: {
    label: "UCLA 3-item Loneliness Scale, US population-based HRS sample (mean 3.89, SD 1.34)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2394670/"
  },
  lsns6: {
    label: "LSNS-6 in three European community samples (means 16.1-17.9, SD ~5.5; < 12 = social isolation risk)",
    url: "https://www.researchgate.net/publication/6867225_Performance_of_an_Abbreviated_Version_of_the_Lubben_Social_Network_Scale_Among_Three_European_Community-Dwelling_Older_Adult_Populations"
  },
  gseScholz: {
    label: "General Self-Efficacy Scale, 25-country norms, N=19,120 (mean 29.55/40, SD 5.32; ~2.96 per item)",
    url: "https://userpage.fu-berlin.de/~health/faq_gse.pdf"
  },
  gritDuckworth: {
    label: "Short Grit Scale adult reference point ~3.4/5 (Duckworth & Quinn 2009)",
    url: "https://www.psytoolkit.org/survey-library/grit-short.html"
  },
  cafWgi: {
    label: "CAF World Giving Index 2024 - Thailand (52% donated money, 19% volunteered, 63% helped a stranger)",
    url: "https://www.cafonline.org/docs/default-source/inside-giving/wgi/wgi_2024_report.pdf"
  },
  thaiPlastic: {
    label: "Thai Pollution Control Dept. 2017 (~8 plastic bags/person/day); post-ban studies ~3 single-use pieces/day",
    url: "https://www.mdpi.com/2071-1050/15/16/12135"
  },
  thaiRetirement: {
    label: "ILO / OECD Pensions at a Glance Asia-Pacific 2024: most Thai workers lack adequate retirement savings; ~2 in 3 over-60s ineligible for a social-security annuity",
    url: "https://www.oecd.org/en/publications/pensions-at-a-glance-asia-pacific-2024_d4146d12-en/full-report/thailand_eaeb7aea.html"
  }
};

// Abramowitz & Stegun 7.1.26 erf approximation (max error ~1.5e-7),
// good far beyond the precision these percentiles claim.
export function normalCdf(x, mean, sd) {
  const z = (x - mean) / (sd * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = (z >= 0 ? 1 : -1) * (1 - poly * Math.exp(-z * z));
  return 0.5 * (1 + erf);
}

function toPercentile(p01) {
  return Math.min(99, Math.max(1, Math.round(p01 * 100)));
}

// Indicative percentile range — a margin reflecting each method's precision,
// NOT a statistical confidence interval (we lack per-norm sample sizes, and a
// fake CI would be the precision theater this module avoids). Widths:
//   distribution = real published mean/SD  -> tightest
//   estimate     = calibrated curve        -> medium
//   threshold    = participation-band placement -> coarsest
// A completed deep (long-form) section raises reliability, so its band is
// roughly half as wide as the short-form one.
const PERCENTILE_MARGIN = { distribution: 6, estimate: 10, threshold: 12 };
const PERCENTILE_MARGIN_VERIFIED = { distribution: 3, estimate: 5, threshold: 8 };

export function percentileRange(percentile, method, verified = false) {
  const table = verified ? PERCENTILE_MARGIN_VERIFIED : PERCENTILE_MARGIN;
  const margin = table[method] ?? (verified ? 5 : 10);
  return {
    low: Math.max(1, percentile - margin),
    high: Math.min(99, percentile + margin)
  };
}

// Coarse plain-language band for a percentile, for a friendlier presentation
// than a bare number. `label` is the canonical English string (the UI localizes
// it with t()). Kept here (not in the UI) so it is unit-testable without a DOM.
export const PERCENTILE_BANDS = [
  { min: 90, key: "top10", label: "Top 10%" },
  { min: 75, key: "top25", label: "Top 25%" },
  { min: 60, key: "above", label: "Above average" },
  { min: 40, key: "around", label: "Around average" },
  { min: 25, key: "below", label: "Below average" },
  { min: 0, key: "bottom", label: "Bottom 25%" }
];

export function percentileBand(percentile) {
  return PERCENTILE_BANDS.find(b => percentile >= b.min) || PERCENTILE_BANDS[PERCENTILE_BANDS.length - 1];
}

export function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

// --- FINANCE: income vs Thai worker earnings ---
// Lognormal approximation calibrated so the mean matches the LFS average
// wage (~15,972 THB/mo); Bangkok median scaled up by the SES household
// income ratio (39,100 / 29,000 ~ 1.35). sigma 0.65 is a typical wage
// dispersion; this is an estimate, not published decile data.
const INCOME_MEDIAN_NATIONAL = 12900;
const INCOME_MEDIAN_BANGKOK = 17400;
const INCOME_LOG_SIGMA = 0.65;

// Single source of truth for income -> population percentile (finding #9).
// The finance SCORE (state.js) and this benchmark card both read this one
// cited lognormal model, so a given income can no longer read two different
// ways on the same screen.
export function incomePercentile(income, region) {
  const inc = parseFloat(income || 0);
  if (!(inc > 0)) return 1;
  const median = region === "Bangkok" ? INCOME_MEDIAN_BANGKOK : INCOME_MEDIAN_NATIONAL;
  return toPercentile(normalCdf(Math.log(inc), Math.log(median), INCOME_LOG_SIGMA));
}

function financeBenchmark(profile) {
  const income = parseFloat(profile.income || 0);
  const percentile = incomePercentile(income, profile.region);
  return {
    percentile,
    method: "estimate",
    summary: tp(profile.region === "Bangkok"
      ? "Income of {income} THB/mo vs Bangkok workers"
      : "Income of {income} THB/mo vs Thai workers", { income: Math.round(income).toLocaleString() }),
    notes: [
      t("Lognormal curve calibrated to the Labour Force Survey average wage; NSO does not publish worker-level deciles openly."),
      t("The income spread (log-sigma 0.65) is an assumed wage dispersion, not published decile data — the rank is approximate.")
    ],
    sources: [SOURCES.botWage, SOURCES.nsoIncome]
  };
}

// --- PHYSICAL: weekly MET-minutes vs Thai adults ---
// Anchor: ~71% of Thai adults meet the WHO guideline (600 MET-min/week),
// the midpoint of the 66.6-75.6% range across SPA 2012-2019 rounds.
const MET_GUIDELINE = 600;
const SHARE_BELOW_GUIDELINE = 0.29;

function metMinutes(profile) {
  return (8.0 * (profile.weeklyVigorousDays || 0) * (profile.weeklyVigorousMins || 0))
    + (4.0 * (profile.weeklyModerateDays || 0) * (profile.weeklyModerateMins || 0))
    + (3.3 * (profile.weeklyWalkingDays || 0) * (profile.weeklyWalkingMins || 0));
}

function physicalBenchmark(profile) {
  const met = metMinutes(profile);
  let p01;
  if (met < MET_GUIDELINE) {
    // Below the guideline you sit somewhere in the inactive 29%.
    p01 = (met / MET_GUIDELINE) * SHARE_BELOW_GUIDELINE;
  } else {
    // 600 MET-min = 29th percentile anchor; the curve above it is an
    // estimate (Thai MVPA is work-dominated and high volume).
    p01 = SHARE_BELOW_GUIDELINE + Math.min(0.66, ((met - MET_GUIDELINE) / 5400) * 0.66);
  }

  const notes = [];
  const w = parseFloat(profile.weight || 0);
  const h = parseFloat(profile.height || 0) / 100;
  if (w > 0 && h > 0) {
    const bmi = w / (h * h);
    const overweightShare = profile.gender === "male" ? 32.9 : profile.gender === "female" ? 41.8 : 37.5;
    notes.push(tp(bmi < 25
      ? "BMI {bmi} — below the BMI-25 line that {share}% of Thai adults are over."
      : "BMI {bmi} — in the {share}% of Thai adults at BMI 25+.", { bmi: bmi.toFixed(1), share: overweightShare }));
  }

  return {
    percentile: toPercentile(p01),
    method: "estimate",
    summary: tp("{met} MET-min/week vs Thai adults (WHO guideline = 600)", { met: Math.round(met) }),
    notes,
    sources: [SOURCES.thaiSpa, SOURCES.nhesBmi]
  };
}

// --- Thai norm sourcing (researched 2026-07) ---
// The profile-based benchmarks above (income, activity, BMI, giving, plastics,
// retirement) already use Thai sources. The survey-instrument benchmarks below
// (WHO-5, UCLA-3/LSNS-6, GSE) keep foreign GENERAL-POPULATION norms on purpose:
// no representative Thai general-population norm appears to be published for any
// of them. The Thai studies that do exist are non-representative and would trade
// a country mismatch for a worse sampling bias, so they are deliberately NOT used:
//   - WHO-5: only Thai primary-care patients (mean 14.32/25, SD 5.26; Saipanish
//     2009, PubMed 19335382) — a clinical, low-skewed sample, not the public.
//   - GSE: only Thais with type-2 diabetes (PeerJ 2022, PMC9135036) — clinical.
//   - UCLA-3 / LSNS-6: only older-adult regional samples (e.g. Thanakwang 2012,
//     Nan Province, age 60+) — wrong age band, not general-population.
// Keeping a representative foreign norm + the in-UI caveat is the honest choice;
// revisit only if a representative Thai general-population dataset is published.

// --- MENTAL: WHO-5 vs community norms ---
function mentalBenchmark(baseline) {
  if (!baseline || !Number.isFinite(baseline.who5)) return null;
  const score100 = baseline.who5 * 4; // raw 0-25 -> 0-100
  const notes = [];
  if (Number.isFinite(baseline.st5)) {
    const band = baseline.st5 <= 4 ? "no stress problem" : baseline.st5 <= 6 ? "possible stress problem" : "stress problem";
    notes.push(tp('ST-5 stress score {n}/15 — "{band}" band on the Thai DMH scale.', { n: baseline.st5, band: t(band) }));
  }
  notes.push(t("Percentile is against a German WHO-5 community sample — no representative Thai WHO-5 norm is published, so read it as indicative."));
  return {
    percentile: toPercentile(normalCdf(score100, 67.56, 22.96)),
    method: "distribution",
    summary: tp("WHO-5 well-being {score}/100 vs general-population norms", { score: score100 }),
    notes,
    sources: [SOURCES.who5Norms, SOURCES.st5Dmh]
  };
}

// --- RELATIONSHIPS: loneliness + social network vs published samples ---
function relationshipsBenchmark(baseline) {
  if (!baseline || !Number.isFinite(baseline.ucla) || !Number.isFinite(baseline.lsns)) return null;
  const uclaP = 1 - normalCdf(baseline.ucla, 3.89, 1.34); // lower loneliness = better
  const lsnsP = normalCdf(baseline.lsns, 17.0, 5.5);
  const notes = [
    tp(baseline.lsns < 12
      ? "LSNS-6 score {n}/30 is under the social-isolation cutoff of 12."
      : "LSNS-6 score {n}/30 is above the social-isolation cutoff of 12.", { n: baseline.lsns })
  ];
  return {
    percentile: toPercentile((uclaP + lsnsP) / 2),
    method: "estimate",
    summary: t("Loneliness (UCLA-3) and social network (LSNS-6) vs published community samples"),
    notes,
    sources: [SOURCES.ucla3, SOURCES.lsns6]
  };
}

// --- PERSONAL GOALS: self-efficacy vs 25-country norms ---
function personalGoalsBenchmark(baseline) {
  if (!baseline || !Number.isFinite(baseline.gse)) return null;
  // The deep section captures the full GSE-10, which matches the 25-country
  // norm exactly; without it we per-item-approximate from the GSE-6 short form.
  const deepGse = baseline.deep && Number.isFinite(baseline.deep.gse10);
  const perItem = deepGse ? baseline.deep.gse10 / 10 : baseline.gse / 6;
  const notes = [];
  if (Number.isFinite(baseline.grit)) {
    const deepGrit = baseline.deep && Number.isFinite(baseline.deep.grit12);
    notes.push(deepGrit
      ? tp("Grit {g}/5 from your full 12-item scale vs the ~3.4 adult reference point.", { g: (baseline.deep.grit12 / 12).toFixed(1) })
      : tp("Grit {g}/5 — the onboarding measure is the perseverance facet only (4 of the 8 Grit-S items), so this is indicative, not an exact match to the ~3.4 reference.", { g: (baseline.grit / 4).toFixed(1) }));
  }
  notes.push(deepGse
    ? t("Scored from your full 10-item GSE — a direct match to the 25-country norm, no short-form approximation.")
    : t("Your 6-item GSE is compared per-item against 10-item GSE norms — a short-form approximation, not an exact match."));
  return {
    // Per-item comparison against the GSE-10 norm (29.55/10 items = 2.96,
    // SD 5.32/10 = 0.53). With the deep GSE-10 this is exact; the GSE-6 short
    // form is an approximation.
    percentile: toPercentile(normalCdf(perItem, 2.955, 0.532)),
    method: deepGse ? "distribution" : "estimate",
    summary: t("Self-efficacy (GSE) vs 25-country norms, N=19,120"),
    notes,
    sources: [SOURCES.gseScholz, SOURCES.gritDuckworth]
  };
}

// --- SOCIAL CONTRIBUTION: giving participation vs CAF Thailand rates ---
function socialContributionBenchmark(profile) {
  const donates = parseFloat(profile.monthlyDonations || 0) > 0;
  const volunteers = parseFloat(profile.volunteeringHours || 0) > 0;
  // Thailand 2024: 52% donated, 19% volunteered. Band midpoints:
  // neither -> middle of the non-donor 48%; donor -> middle of the donor
  // band; volunteer -> inside the top 19%; both -> upper end of it.
  let percentile, band;
  if (donates && volunteers) {
    percentile = 88;
    band = "donates and volunteers — inside the 19% of Thais who volunteer";
  } else if (volunteers) {
    percentile = 82;
    band = "volunteers — inside the 19% of Thais who volunteer";
  } else if (donates) {
    percentile = 62;
    band = "donates — inside the 52% of Thais who gave money";
  } else {
    percentile = 24;
    band = "no regular giving yet — 52% of Thais donated last year";
  }
  return {
    percentile,
    method: "threshold",
    summary: tp("Giving participation: {band}", { band: t(band) }),
    notes: [t("Participation-rate placement, not an exact rank — CAF publishes yes/no rates, not amounts.")],
    sources: [SOURCES.cafWgi]
  };
}

// --- ENVIRONMENT: single-use plastics vs Thai daily average ---
const PLASTIC_BANDS = [
  { max: 0, percentile: 90 },
  { max: 1, percentile: 78 },
  { max: 2, percentile: 64 },
  { max: 3, percentile: 50 }, // ~ current Thai average of ~3 pieces/day
  { max: 5, percentile: 34 },
  { max: 7, percentile: 20 },
  { max: Infinity, percentile: 10 }
];

function environmentBenchmark(profile) {
  const pieces = parseInt(profile.singleUsePlastics || 0);
  const { percentile } = PLASTIC_BANDS.find(b => pieces <= b.max);
  return {
    percentile,
    method: "estimate",
    summary: tp("{pieces} single-use plastic pieces/day vs the ~3/day Thai average", { pieces }),
    notes: [t("Banded around the post-plastic-ban Thai average; per-person distribution data is not published.")],
    sources: [SOURCES.thaiPlastic]
  };
}

// --- HUMANITY'S FUTURE: long-term security vs Thai retirement coverage ---
function humanityFutureBenchmark(profile) {
  const invested = Boolean(profile.longTermInvestments);
  return {
    percentile: invested ? 70 : 30,
    method: "threshold",
    summary: t(invested
      ? "Holds long-term retirement investments — ahead of most Thai workers"
      : "No long-term retirement investments yet — like most Thai workers"),
    notes: [t("Most Thai workers lack adequate retirement savings; ~2 in 3 over-60s get no social-security annuity.")],
    sources: [SOURCES.thaiRetirement]
  };
}

// Returns {aspectKey: benchmark|null}. Survey-based aspects need
// state.baseline (raw instrument sums stored at onboarding) and return
// null for saves made before it existed.
export function getAllBenchmarks(state) {
  const profile = state.profile || {};
  const baseline = state.baseline || null;
  const set = {
    finance: financeBenchmark(profile),
    physical: physicalBenchmark(profile),
    mental: mentalBenchmark(baseline),
    relationships: relationshipsBenchmark(baseline),
    personalGoals: personalGoalsBenchmark(baseline),
    socialContribution: socialContributionBenchmark(profile),
    environment: environmentBenchmark(profile),
    humanityFuture: humanityFutureBenchmark(profile)
  };
  // Attach an indicative percentile range to every computable benchmark in one
  // place (immutably) so each *Benchmark function stays focused on its score.
  // Deep-verified aspects get the narrower band.
  const deepDone = (baseline && baseline.deepDone) || {};
  const withRanges = {};
  for (const [key, b] of Object.entries(set)) {
    withRanges[key] = b ? { ...b, range: percentileRange(b.percentile, b.method, !!deepDone[key]), verified: !!deepDone[key] } : null;
  }
  return withRanges;
}

// Unique source list across a benchmark set, for the citations card.
export function collectSources(benchmarks) {
  const seen = new Set();
  const list = [];
  Object.values(benchmarks).forEach(b => {
    if (!b) return;
    b.sources.forEach(src => {
      if (!seen.has(src.url)) {
        seen.add(src.url);
        list.push(src);
      }
    });
  });
  return list;
}
