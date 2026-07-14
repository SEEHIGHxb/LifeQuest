// ui.js - LifeQuest UI Rendering Views & Lumi Dialogue

import { stateManager } from "./state.js";
import { renderRadarChart, renderTrendChart } from "./chart.js";
import { INSTRUMENTS, DEEP_INSTRUMENTS, DEEP_SECTIONS, deepSectionInstruments } from "./surveys.js";
import { getAllBenchmarks, collectSources, percentileBand } from "./benchmarks.js";
import { getAspectDetail, getAspectConfidence, ASPECT_KEYS, isAspectDeepVerified } from "./aspects.js";
import { getAspectSuggestions, getTopSuggestions, getMentalHealthNotice } from "./suggestions.js";
import { encodeCrewCode, decodeCrewCode, crewPoints } from "./crewcode.js";
import { validateProfile, buildProvidedFlags, buildAnsweredFlags } from "./validation.js";
import { t, tp, percentileLabel, dateLocale } from "./i18n.js";

// Escape user-provided strings before inserting into innerHTML.
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const ASPECT_LABELS = {
  finance: "Finance",
  physical: "Physical",
  mental: "Mental",
  relationships: "Relationships",
  personalGoals: "Personal Goals",
  socialContribution: "Social Contribution",
  environment: "Environment",
  humanityFuture: "Humanity's Future"
};

// Localized aspect label (falls back to the raw key).
// Escaped: an unknown key (e.g. from an imported save) falls through to `key`
// itself, which would otherwise be echoed raw into innerHTML.
const aspectLabel = key => escapeHtml(t(ASPECT_LABELS[key] || key));

// --- CONFIDENCE UI (Phase 2) ---

const CONFIDENCE_LABELS = () => ({ verified: t("In-depth"), high: t("High"), partial: t("Partial"), estimated: t("Estimated") });

// Aspects whose survey inputs the monthly re-assessment (#/checkin) re-runs, so
// an estimated one there gets an actionable link rather than text-only guidance.
const CHECKIN_ASPECTS = ["mental", "relationships", "personalGoals"];

// Small tier badge for an aspect (dashboard rows + aspect header). Empty string
// when confidence is unknown (older saves with no captured coverage).
function confidenceBadge(conf) {
  if (!conf || !conf.tier) return "";
  const title = conf.tier === "verified"
    ? t("Measured with the full long-form instruments (deep assessment complete)")
    : tp("Score confidence: {answered} of {total} inputs answered", { answered: conf.answered, total: conf.total });
  return `<span class="confidence-badge confidence-${conf.tier}" title="${escapeHtml(title)}">${CONFIDENCE_LABELS()[conf.tier]}</span>`;
}

// Component-row chip: shown for partial/estimated (to flag low confidence) and
// for verified (to credit deep-assessment rows); high stays uncluttered.
function componentConfidenceChip(tier) {
  if (tier !== "partial" && tier !== "estimated" && tier !== "verified") return "";
  return `<span class="component-confidence confidence-${tier}">${CONFIDENCE_LABELS()[tier]}</span>`;
}

// --- FRIENDLIER PERCENTILE PRESENTATION ---
//
// A percentile is jargon; most people read "ahead of ~62% of people like you"
// far more easily. These helpers turn the raw percentile into a plain-language
// phrase and a one-line definition; the coarse band label comes from
// percentileBand() in benchmarks.js. The exact number and its indicative range
// stay available as secondary detail.

// The headline sentence a non-technical reader understands at a glance.
function percentilePhrase(percentile) {
  return tp("Ahead of about {pct}% of people like you", { pct: percentile });
}

// One shared "Standing vs society" block, used on the dashboard row and the
// aspect gauge. `compact` trims it to a single line for the dashboard list.
function benchmarkStanding(b, { compact = false } = {}) {
  const band = percentileBand(b.percentile);
  const chip = `<span class="percentile-band band-${band.key}">${t(band.label)}</span>`;
  const detail = tp("{pct} percentile · typical range {low}–{high}", {
    pct: percentileLabel(b.percentile),
    low: percentileLabel(b.range.low),
    high: percentileLabel(b.range.high)
  });
  if (compact) {
    return `<span class="benchmark-plain">${percentilePhrase(b.percentile)}</span> ${chip} <span class="benchmark-detail">${detail}</span>`;
  }
  return `
    <p class="benchmark-plain-lead">${percentilePhrase(b.percentile)} ${chip}</p>
    <p class="benchmark-detail">${detail}${b.verified ? ` · <span class="benchmark-verified">${t("in-depth verified")}</span>` : ""}</p>
    <p class="gauge-note percentile-definition">${t("“Percentile” = the share of people you're ahead of, so higher is better. The range shows how precise this estimate is, not a statistical confidence interval.")}</p>`;
}

// Aspect keys currently scored purely from defaults (tier === "estimated").
function estimatedAspects(state) {
  return ASPECT_KEYS.filter(k => getAspectConfidence(state, k).tier === "estimated");
}

// Sample profiles that populate the peer-comparison board until real codes are added
const MOCK_COMPETITORS = [
  { name: "Nadia", level: 48, totalPoints: 4850 },
  { name: "Marcus", level: 42, totalPoints: 4280 },
  { name: "Priya", level: 31, totalPoints: 3150 },
  { name: "Kenji", level: 24, totalPoints: 2420 },
  { name: "Sofia", level: 19, totalPoints: 1950 },
  { name: "Liam", level: 12, totalPoints: 1280 }
];

// Presets for actions that users can log.
// `metric` marks quantifiable actions: the user is asked for the real amount,
// which is stored on the history entry (raw data for measured scoring).
export const ACTION_PRESETS = [
  { id: "save_money", title: "Add to Savings", aspect: "finance", impacts: { finance: 8 }, xp: 20, desc: "Deposit money/savings (+8 Finance)",
    metric: { label: "Amount saved", unit: "THB", default: 500, min: 1, max: 1000000, step: 1 } },
  { id: "cbt_journal", title: "CBT Journaling", aspect: "mental", impacts: { mental: 8 }, xp: 20, desc: "Write cognitive reappraisal (+8 Mental)" },
  { id: "phys_sigh", title: "Physiological Sigh", aspect: "mental", impacts: { mental: 5 }, xp: 10, desc: "Breath control vagus reset (+5 Mental)" },
  { id: "workout", title: "Exercise Session", aspect: "physical", impacts: { physical: 10, mental: 3 }, xp: 30, desc: "Exercise MVPA (+10 Phys, +3 Mental)",
    metric: { label: "Duration", unit: "minutes", default: 30, min: 5, max: 600, step: 5 } },
  { id: "eat_veggies", title: "Veggie Portions", aspect: "physical", impacts: { physical: 5 }, xp: 15, desc: "Eat healthy greens (+5 Physical)",
    metric: { label: "Portions today", unit: "portions", default: 5, min: 1, max: 15, step: 1 } },
  { id: "drink_water", title: "Water Intake", aspect: "physical", impacts: { physical: 5 }, xp: 10, desc: "Hydration target (+5 Physical)",
    metric: { label: "Amount today", unit: "liters", default: 2.5, min: 0.5, max: 10, step: 0.1 } },
  { id: "call_friend", title: "Connect with Friend", aspect: "relationships", impacts: { relationships: 10, mental: 2 }, xp: 20, desc: "Call relative or friend (+10 Rel, +2 Ment)" },
  { id: "date_night", title: "Relationship Date", aspect: "relationships", impacts: { relationships: 8 }, xp: 25, desc: "Quality partner time (+8 Relationships)" },
  { id: "make_merit", title: "Make Merit / Donation", aspect: "socialContribution", impacts: { socialContribution: 10, finance: -2 }, xp: 25, desc: "Tham Bun / Donate (+10 Social, -2 Fin)",
    metric: { label: "Amount donated", unit: "THB", default: 100, min: 1, max: 1000000, step: 1 } },
  { id: "volunteer", title: "Volunteer", aspect: "socialContribution", impacts: { socialContribution: 12 }, xp: 35, desc: "Community service (+12 Social)",
    metric: { label: "Time spent", unit: "hours", default: 1, min: 0.5, max: 24, step: 0.5 } },
  { id: "recycle_waste", title: "Separate Recycling", aspect: "environment", impacts: { environment: 8 }, xp: 15, desc: "Household waste sort (+8 Env)" },
  { id: "public_transit", title: "Ride BTS / MRT", aspect: "environment", impacts: { environment: 8 }, xp: 20, desc: "Avoid car commute (+8 Env)" },
  { id: "learn_future_skills", title: "Study AI / Data Sci", aspect: "humanityFuture", impacts: { humanityFuture: 10, personalGoals: 5 }, xp: 30, desc: "Upskill future tech (+10 Future, +5 Goals)",
    metric: { label: "Study time", unit: "hours", default: 1, min: 0.5, max: 16, step: 0.5 } },
  { id: "mentor_someone", title: "Mentor / Teach", aspect: "humanityFuture", impacts: { humanityFuture: 8, relationships: 2 }, xp: 25, desc: "Share upskilling (+8 Future, +2 Rel)" }
];

export function getLumiTip(aspects) {
  // Find lowest aspect
  let lowestAspect = "mental";
  let minVal = 101;
  for (const [key, val] of Object.entries(aspects)) {
    if (val < minVal) {
      minVal = val;
      lowestAspect = key;
    }
  }

  const dialogs = {
    finance: "Your finance score has room to grow. A simple monthly budget and a set savings rate are good starting points.",
    physical: "Your physical activity could use a lift. A short walk today is an easy way to build momentum.",
    mental: "Feeling stretched? Try a slow breathing break — two short inhales through the nose, then one long exhale.",
    relationships: "Connection matters. Consider reaching out to a close friend or relative this week.",
    personalGoals: "Steady practice moves your goals forward. Even 20 minutes of focused learning today helps.",
    socialContribution: "Small acts of giving add up. A minor kindness or a modest donation strengthens this area.",
    environment: "Everyday choices shape your footprint. Separating recyclables today is a simple step.",
    humanityFuture: "Long-term security grows from consistent habits — saving and upskilling both anchor your future."
  };

  return t(dialogs[lowestAspect] || "Log a routine today to keep your assessment current and track your progress.");
}

// --- ONBOARDING FORM BUILDERS ---

function numberField(id, label, value, attrs = "") {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input type="number" id="${id}" class="form-control" value="${value}" ${attrs}>
      <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
    </div>`;
}

function radioQuestion(instrKey, itemIndex, item) {
  return `
    <fieldset class="survey-question">
      <legend>${itemIndex + 1}. ${t(item.text)}</legend>
      <div class="radio-group">
        ${item.options.map(o => `
          <label class="radio-option">
            <input type="radio" name="${instrKey}-q${itemIndex}" value="${o.v}" ${o.v === item.def ? "checked" : ""}>
            ${t(o.l)}
          </label>`).join("")}
      </div>
    </fieldset>`;
}

function instrumentBlock(instrKey) {
  const instr = INSTRUMENTS[instrKey];
  return `
    <div class="instrument-block">
      <p class="instrument-title">${t(instr.title)}</p>
      ${instr.items.map((item, i) => radioQuestion(instrKey, i, item)).join("")}
    </div>`;
}

function collectInstrument(instrKey) {
  return INSTRUMENTS[instrKey].items.map((item, i) => {
    const el = document.querySelector(`input[name="${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : item.def;
  });
}

// Deep-assessment instruments live in DEEP_INSTRUMENTS and use a "deep-" name
// prefix so their radios never collide with an onboarding form on the page.
function deepInstrumentBlock(instrKey) {
  const instr = DEEP_INSTRUMENTS[instrKey];
  return `
    <div class="instrument-block">
      <p class="instrument-title">${t(instr.title)}</p>
      ${instr.items.map((item, i) => radioQuestion(`deep-${instrKey}`, i, item)).join("")}
    </div>`;
}

function collectDeepInstrument(instrKey) {
  return DEEP_INSTRUMENTS[instrKey].items.map((item, i) => {
    const el = document.querySelector(`input[name="deep-${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : item.def;
  });
}

// Maps each validated numeric field (validation.js FIELD_CONSTRAINTS keys) to
// its onboarding input id — used for reading, inline error placement, and
// coverage tracking. Both directions are needed, so it is defined once here.
const ONB_NUMERIC_IDS = {
  income: "onb-income", savingsRate: "onb-savings", digitalLiteracy: "onb-digital",
  weeklyLearningHours: "onb-learning", weeklyVigorousDays: "onb-vig-days",
  weeklyVigorousMins: "onb-vig-mins", weeklyModerateDays: "onb-mod-days",
  weeklyModerateMins: "onb-mod-mins", weeklyWalkingDays: "onb-walk-days",
  weeklyWalkingMins: "onb-walk-mins", weight: "onb-weight", height: "onb-height",
  sleepHours: "onb-sleep", vegetablePortions: "onb-veg", waterLiters: "onb-water",
  singleUsePlastics: "onb-plastics", monthlyDonations: "onb-donations",
  volunteeringHours: "onb-volunteer"
};

// 1. RENDER ONBOARDING SURVEY
export function renderOnboarding(containerId, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pages = [
    {
      title: t("Step 1: Profile & Finance"),
      optional: false,
      why: t("We start with income and demographics so your scores can be compared against real population benchmarks."),
      body: `
        <div class="form-group">
          <label for="onb-name">${t("Name")}</label>
          <input type="text" id="onb-name" class="form-control" placeholder="${t("E.g., Alex")}" value="${t("Guest")}" maxlength="40">
        </div>
        <div class="grid-2">
          ${numberField("onb-age", t("Age (for population benchmarks)"), 25, 'min="15" max="100"')}
          <div class="form-group">
            <label for="onb-gender">${t("Gender (for benchmark norms)")}</label>
            <select id="onb-gender" class="form-control">
              <option value="unspecified">${t("Prefer not to say")}</option>
              <option value="male">${t("Male")}</option>
              <option value="female">${t("Female")}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="onb-region">${t("Primary Region (Cost of Living Mapping)")}</label>
          <select id="onb-region" class="form-control">
            <option value="Provinces">${t("Provinces / Upcountry Thailand")}</option>
            <option value="Bangkok">${t("Bangkok & Vicinity")}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="onb-employment">${t("Employment Status")}</label>
          <select id="onb-employment" class="form-control">
            <option value="Office Worker">${t("Office Worker / Salary Employee")}</option>
            <option value="Freelancer">${t("Freelancer / Independent")}</option>
            <option value="Business Owner">${t("Business Owner / Entrepreneur")}</option>
            <option value="Unemployed">${t("Unemployed / Looking for Work")}</option>
            <option value="Student">${t("Student")}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="onb-relationship">${t("Relationship Status")}</label>
          <select id="onb-relationship" class="form-control">
            <option value="Single">${t("Single")}</option>
            <option value="Coupled">${t("In a Relationship / Married")}</option>
          </select>
        </div>
        ${numberField("onb-income", t("Monthly Individual Income (Net THB)"), 15000, 'min="0"')}
        ${numberField("onb-savings", t("Monthly Savings Rate (% of Income)"), 10, 'min="0" max="100"')}
        ${instrumentBlock("cfpb")}`
    },
    {
      title: t("Step 2: Physical Baseline"),
      optional: false,
      why: t("A few body and activity numbers place your physical health against national norms."),
      body: `
        <div class="grid-2">
          ${numberField("onb-height", t("Height (cm)"), 170, 'min="100" max="250"')}
          ${numberField("onb-weight", t("Weight (kg)"), 60, 'min="25" max="300"')}
        </div>
        <div class="grid-2">
          ${numberField("onb-sleep", t("Average Nightly Sleep (Hours)"), 7, 'min="0" max="16" step="0.5"')}
          ${numberField("onb-veg", t("Vegetable/Fruit Portions per Day"), 2, 'min="0" max="15"')}
        </div>
        ${numberField("onb-water", t("Water Intake per Day (Liters)"), 1.5, 'min="0" max="10" step="0.1"')}
        <p class="instrument-title">${t("Weekly Physical Activity (IPAQ)")}</p>
        <div class="grid-2">
          ${numberField("onb-vig-days", t("Vigorous Exercise (Days/Week)"), 0, 'min="0" max="7"')}
          ${numberField("onb-vig-mins", t("Vigorous Minutes per Day"), 0, 'min="0" max="600"')}
        </div>
        <div class="grid-2">
          ${numberField("onb-mod-days", t("Moderate Exercise (Days/Week)"), 0, 'min="0" max="7"')}
          ${numberField("onb-mod-mins", t("Moderate Minutes per Day"), 0, 'min="0" max="600"')}
        </div>
        <div class="grid-2">
          ${numberField("onb-walk-days", t("Walking (Days/Week)"), 3, 'min="0" max="7"')}
          ${numberField("onb-walk-mins", t("Walking Minutes per Day"), 20, 'min="0" max="600"')}
        </div>
        ${instrumentBlock("jss")}`
    },
    {
      title: t("Step 3: Mental Well-Being"),
      optional: false,
      why: t("Two validated screens (ST-5, WHO-5) estimate stress and well-being. This is a self-check, not a diagnosis."),
      body: `
        ${instrumentBlock("st5")}
        ${instrumentBlock("who5")}`
    },
    {
      title: t("Step 4: Relationships"),
      optional: true,
      why: t("Optional — you can see your results now, or answer to score social connection and loneliness."),
      body: `
        ${instrumentBlock("lsns")}
        ${instrumentBlock("ucla")}
        <div id="ras-block" class="d-none">
          ${instrumentBlock("ras")}
        </div>`
    },
    {
      title: t("Step 5: Goals & Learning"),
      optional: true,
      why: t("Optional — self-efficacy and perseverance, plus your weekly learning habits."),
      body: `
        ${instrumentBlock("gse")}
        ${instrumentBlock("grit")}
        <div class="grid-2">
          ${numberField("onb-learning", t("Weekly Learning / Study Hours"), 2, 'min="0" max="80" step="0.5"')}
          ${numberField("onb-digital", t("Digital Literacy Self-Rating (0-100)"), 50, 'min="0" max="100"')}
        </div>`
    },
    {
      title: t("Step 6: Contribution, Environment & Future"),
      optional: true,
      why: t("Optional — prosocial habits, everyday environmental behavior, and your long-term outlook."),
      body: `
        ${instrumentBlock("ptm")}
        <div class="grid-2">
          ${numberField("onb-donations", t("Monthly Donations (THB)"), 0, 'min="0"')}
          ${numberField("onb-volunteer", t("Volunteering Hours per Month"), 0, 'min="0" max="300"')}
        </div>
        ${instrumentBlock("geb")}
        ${numberField("onb-plastics", t("Single-Use Plastic Items per Week"), 5, 'min="0" max="100"')}
        ${instrumentBlock("lfis")}
        <div class="form-group">
          <label for="onb-pension">${t("Long-term pension / retirement products (SSF, RMF, stock portfolio)?")}</label>
          <select id="onb-pension" class="form-control">
            <option value="false">${t("No, not yet planning pension")}</option>
            <option value="true">${t("Yes, retirement assets secured")}</option>
          </select>
        </div>`
    }
  ];

  const totalSteps = pages.length;
  const EXPRESS_FROM = 2; // "See my results now" unlocks once the core aspects (steps 1-3) are done

  container.innerHTML = `
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 18px;">
        <h1>${t("PERSONAL WELLBEING ASSESSMENT")}</h1>
        <p>${t("Baseline Assessment")}</p>
      </div>
      <div class="onb-progress">
        <div class="onb-progress-head">
          <span id="onb-step-label"></span>
          <span id="onb-step-time"></span>
        </div>
        <div class="onb-progress-track"><div class="onb-progress-fill" id="onb-progress-fill"></div></div>
      </div>
      <form id="onboarding-form">
        ${pages.map((page, i) => `
          <div class="survey-page ${i === 0 ? "" : "d-none"}" id="onb-page-${i}">
            <h3 class="card-header">${page.title}${page.optional ? ` <span class="onb-optional">${t("Optional")}</span>` : ""}</h3>
            <p class="onb-why">${page.why}</p>
            ${page.body}
            <div class="onb-nav">
              ${i > 0 ? `<button type="button" class="btn btn-onb-prev" data-page="${i}">${t("Back")}</button>` : `<span></span>`}
              <div class="onb-nav-right">
                ${i >= EXPRESS_FROM && i < totalSteps - 1
                  ? `<button type="button" class="btn btn-onb-express">${t("See my results now")}</button>` : ""}
                ${i < totalSteps - 1
                  ? `<button type="button" class="btn btn-primary btn-onb-next" data-page="${i}">${t("Next")}</button>`
                  : `<button type="submit" class="btn btn-primary">${t("Complete Assessment")}</button>`}
              </div>
            </div>
          </div>`).join("")}
      </form>
      <p id="onboarding-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  const updateProgress = (idx) => {
    const fill = document.getElementById("onb-progress-fill");
    const label = document.getElementById("onb-step-label");
    const time = document.getElementById("onb-step-time");
    if (fill) fill.style.width = `${Math.round(((idx + 1) / totalSteps) * 100)}%`;
    if (label) label.textContent = tp("Step {n} of {total}", { n: idx + 1, total: totalSteps });
    if (time) time.textContent = idx >= EXPRESS_FROM
      ? t("You can finish here anytime")
      : t("About 5 minutes total");
  };

  const showPage = (idx) => {
    pages.forEach((_, i) => {
      document.getElementById(`onb-page-${i}`).classList.toggle("d-none", i !== idx);
    });
    updateProgress(idx);
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  container.querySelectorAll(".btn-onb-next").forEach(btn => {
    btn.addEventListener("click", () => showPage(parseInt(btn.dataset.page) + 1));
  });
  container.querySelectorAll(".btn-onb-prev").forEach(btn => {
    btn.addEventListener("click", () => showPage(parseInt(btn.dataset.page) - 1));
  });

  // Show couple questions only when relevant
  const relationshipSelect = document.getElementById("onb-relationship");
  relationshipSelect.addEventListener("change", () => {
    document.getElementById("ras-block").classList.toggle("d-none", relationshipSelect.value === "Single");
  });

  updateProgress(0);

  // Coverage capture (the linchpin): numeric inputs are pre-filled and
  // instrument radios are pre-checked at their defaults, so the only reliable
  // signal that the user actually answered is an interaction event. A change
  // never fires for a pre-selected default, so these sets stay honest.
  const touchedFields = new Set();
  const touchedInstruments = new Set();
  const idToField = Object.fromEntries(
    Object.entries(ONB_NUMERIC_IDS).map(([field, id]) => [id, field])
  );
  const form = document.getElementById("onboarding-form");
  form.addEventListener("input", (e) => {
    const field = idToField[e.target.id];
    if (field) touchedFields.add(field);
  });
  form.addEventListener("change", (e) => {
    const match = (e.target.name || "").match(/^([a-z0-9]+)-q\d+$/i);
    if (match) touchedInstruments.add(match[1]);
  });

  const clearFieldErrors = () => {
    Object.values(ONB_NUMERIC_IDS).forEach(id => {
      const errEl = document.getElementById(`${id}-err`);
      if (errEl) { errEl.textContent = ""; errEl.classList.add("d-none"); }
    });
  };

  // Build the survey payload from whatever is currently in the DOM. Unfilled
  // sections keep their safe instrument/field defaults, so an early finish via
  // "See my results now" (express=true) still yields a valid baseline.
  const doSubmit = (express) => {
    const errorEl = document.getElementById("onboarding-error");
    errorEl.classList.add("d-none");
    clearFieldErrors();
    try {
      const val = (id) => document.getElementById(id).value;

      const surveyData = {
        name: val("onb-name"),
        age: val("onb-age"),
        gender: val("onb-gender"),
        region: val("onb-region"),
        employment: val("onb-employment"),
        relationshipStatus: val("onb-relationship"),
        income: val("onb-income"),
        savingsRate: val("onb-savings"),
        height: val("onb-height"),
        weight: val("onb-weight"),
        sleepHours: val("onb-sleep"),
        vegetablePortions: val("onb-veg"),
        waterLiters: val("onb-water"),
        weeklyVigorousDays: val("onb-vig-days"),
        weeklyVigorousMins: val("onb-vig-mins"),
        weeklyModerateDays: val("onb-mod-days"),
        weeklyModerateMins: val("onb-mod-mins"),
        weeklyWalkingDays: val("onb-walk-days"),
        weeklyWalkingMins: val("onb-walk-mins"),
        weeklyLearningHours: val("onb-learning"),
        digitalLiteracy: val("onb-digital"),
        monthlyDonations: val("onb-donations"),
        volunteeringHours: val("onb-volunteer"),
        singleUsePlastics: val("onb-plastics"),
        longTermInvestments: val("onb-pension"),
        cfpb: collectInstrument("cfpb"),
        jss: collectInstrument("jss"),
        st5: collectInstrument("st5"),
        who5: collectInstrument("who5"),
        lsns: collectInstrument("lsns"),
        ucla: collectInstrument("ucla"),
        ras: collectInstrument("ras"),
        gse: collectInstrument("gse"),
        grit: collectInstrument("grit"),
        ptm: collectInstrument("ptm"),
        geb: collectInstrument("geb"),
        lfis: collectInstrument("lfis")
      };

      // Block on hard-invalid input before it degrades into a fake score.
      // Blank optional fields still pass (they fall back to safe defaults).
      const { ok, errors } = validateProfile(surveyData);
      if (!ok) {
        for (const [field, message] of Object.entries(errors)) {
          const errEl = document.getElementById(`${ONB_NUMERIC_IDS[field]}-err`);
          if (errEl) { errEl.textContent = message; errEl.classList.remove("d-none"); }
        }
        errorEl.textContent = t("Please fix the highlighted fields before continuing.");
        errorEl.classList.remove("d-none");
        return;
      }

      const coverage = {
        provided: buildProvidedFlags(touchedFields),
        answered: buildAnsweredFlags(touchedInstruments)
      };
      stateManager.submitOnboarding(surveyData, express, coverage);
      onComplete();
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      errorEl.textContent = t("Assessment Error: ") + err.message;
      errorEl.classList.remove("d-none");
    }
  };

  container.querySelectorAll(".btn-onb-express").forEach(btn => {
    btn.addEventListener("click", () => doSubmit(true));
  });
  document.getElementById("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSubmit(false);
  });
}

// Shared markup for one suggestion entry (dashboard + aspect pages).
function suggestionItem(s, showAspect) {
  return `
    <a href="#/aspect/${s.aspect}" class="suggestion-link">
      <div class="suggestion-item">
        <div class="suggestion-title">${escapeHtml(s.title)}</div>
        <div class="suggestion-text">${escapeHtml(s.text)}</div>
        <div class="suggestion-meta">${showAspect ? `${escapeHtml(s.aspectLabel)} &bull; ` : ""}${escapeHtml(s.componentLabel)}: ${s.componentValue}/100</div>
      </div>
    </a>`;
}

// Pinned commitment progress (dashboard + aspect page).
function commitmentPin(commitment) {
  const pct = Math.min(100, Math.round((commitment.progress / commitment.weeklyTarget) * 100));
  return `
    <div class="commit-head">
      <span>${tp("{aspect} • this week", { aspect: aspectLabel(commitment.aspect) })}</span>
      <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${commitment.progress} / ${commitment.weeklyTarget}</span>
    </div>
    <div class="xp-bar-container" style="height: 6px; margin-top: 4px;" role="progressbar" aria-label="${t("Commitment progress")}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="xp-bar-fill" style="width: ${pct}%;"></div>
    </div>
    <div class="commit-note">${commitment.completed
      ? t("✅ Pledge complete — bonus points banked. Resets next week.")
      : tp("Log {n} more {aspect} routine(s) for +{xp} bonus points.", {
          n: commitment.weeklyTarget - commitment.progress,
          aspect: aspectLabel(commitment.aspect),
          xp: stateManager.commitBonusXp(commitment.weeklyTarget)
        })}</div>`;
}

// 2. RENDER THE MAIN DASHBOARD
// Duty-of-care banner (finding #4). Renders the mental-health support notice
// from getMentalHealthNotice(): static app copy plus Thailand hotline numbers,
// escaped defensively to match the other innerHTML sinks. Returns "" when
// there is nothing to show.
function mentalHealthNotice(notice) {
  if (!notice) return "";
  return `
    <div class="care-banner" role="note" aria-label="${escapeHtml(t("Mental health support"))}">
      <p class="care-banner-title">${escapeHtml(notice.title)}</p>
      <p class="care-banner-text">${escapeHtml(notice.body)}</p>
      <ul class="care-resources">
        ${notice.resources.map(r => `
          <li>
            <span class="care-resource-label">${escapeHtml(r.label)}</span>
            <a class="care-resource-tel" href="tel:${escapeHtml(String(r.tel).replace(/[^0-9+]/g, ""))}">${escapeHtml(r.tel)}</a>
          </li>`).join("")}
      </ul>
    </div>`;
}

export function renderDashboard(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const p = state.profile;
  const xpNeeded = p.level * 100;
  const xpPercent = Math.round((p.xp / xpNeeded) * 100);
  const benchmarks = getAllBenchmarks(state);
  const benchmarkSources = collectSources(benchmarks);
  const suggestions = getTopSuggestions(state, 3);
  const commitment = state.commitment;
  const checkinDue = stateManager.isCheckinDue();

  const METHOD_TAGS = {
    distribution: t("vs published norms"),
    threshold: t("vs participation rates"),
    estimate: t("estimate")
  };

  container.innerHTML = `
    ${mentalHealthNotice(getMentalHealthNotice(state))}
    ${checkinDue ? `
      <div class="checkin-banner">
        <p><strong>${t("Monthly re-assessment due.")}</strong> ${t("Re-run the short well-being instruments so your scores track your real standing, not last month's.")}</p>
        <a href="#/checkin" class="btn btn-primary" style="white-space: nowrap;">${t("Start Re-assessment")}</a>
      </div>` : ""}
    ${state.profile.assessmentComplete === false ? `
      <div class="quickstart-note">
        <p><strong>${t("Quick-start results.")}</strong> ${t("Aspects beyond your first sections use baseline estimates. Log routines to shape them, and monthly re-assessments refine your survey scores over time.")}</p>
      </div>` : ""}
    ${(() => {
      const estimated = estimatedAspects(state);
      if (estimated.length === 0) return "";
      const canDeepen = estimated.some(k => CHECKIN_ASPECTS.includes(k));
      return `
      <div class="quickstart-note completeness-note">
        <p><strong>${t("Some scores are estimates.")}</strong> ${tp("These are scored from default answers: {aspects}. Re-run your assessment or log related routines to confirm them.", { aspects: estimated.map(aspectLabel).join(", ") })}${canDeepen ? ` <a href="#/checkin">${t("Deepen my survey scores")}</a>` : ""}</p>
      </div>`;
    })()}
    ${(() => {
      const done = ASPECT_KEYS.filter(k => isAspectDeepVerified(state, k)).length;
      if (done >= ASPECT_KEYS.length) return "";
      return `
      <div class="deep-banner">
        <div>
          <p><strong>${t("Go deeper for more accurate scores.")}</strong> ${t("An optional in-depth assessment uses the full-length validated questionnaires to sharpen your estimates and tighten each percentile band.")}</p>
          ${done > 0 ? `<p class="deep-progress">${tp("In-depth sections completed: {done}/{total}", { done, total: ASPECT_KEYS.length })}</p>` : ""}
        </div>
        <a href="#/deep" class="btn btn-primary" style="white-space: nowrap;">${done > 0 ? t("Continue in-depth") : t("Start in-depth assessment")}</a>
      </div>`;
    })()}
    <div class="dashboard-grid">
      <!-- LEFT COLUMN: STATUS & RADAR CHART -->
      <div>
        <div class="card" style="display: flex; gap: 20px; align-items: center; padding: 18px 24px;">
          <div style="position: relative;">
            <div class="seal">✦</div>
            <div style="position: absolute; bottom: -5px; right: -5px;" class="level-badge">Lv.${escapeHtml(p.level)}</div>
          </div>
          <div style="flex-grow: 1;">
            <h3 style="font-family: var(--font-serif); font-size: 1.4rem; font-weight: bold; color: var(--color-navy);">${escapeHtml(p.name)}</h3>
            <p style="font-family: var(--font-sans); font-size: 0.82rem; color: var(--color-gold); font-weight: 600;">
              ${escapeHtml(t(p.rank))} &bull; ${escapeHtml(t(p.employment))} (${escapeHtml(t(p.region))})
            </p>
            <div class="xp-bar-container" role="progressbar" aria-label="${t("Experience progress")}" aria-valuenow="${xpPercent}" aria-valuemin="0" aria-valuemax="100">
              <div class="xp-bar-fill" style="width: ${xpPercent}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-family: var(--font-serif); font-size: 0.75rem; margin-top: 4px; color: var(--color-text-secondary);">
              <span>Points: ${escapeHtml(p.xp)} / ${xpNeeded}</span>
              <span>${tp("Progress: {pct}%", { pct: xpPercent })}</span>
            </div>
          </div>
        </div>

        ${commitment ? `
        <div class="card">
          <h4 class="card-header">${t("Weekly Commitment")}</h4>
          <a href="#/aspect/${commitment.aspect}" class="suggestion-link">${commitmentPin(commitment)}</a>
        </div>` : ""}

        <div class="card">
          <h4 class="card-header">${t("Aspect Radar")}</h4>
          <div id="radar-chart-container" style="width: 100%; display: flex; justify-content: center; align-items: center;"></div>
        </div>

        ${suggestions.length > 0 ? `
        <div class="card">
          <h4 class="card-header">${t("Recommendations")}</h4>
          <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 10px;">
            ${t("Targeting your weakest measured components — tap one to open that aspect.")}
          </p>
          ${suggestions.map(s => suggestionItem(s, true)).join("")}
        </div>` : ""}
      </div>

      <!-- RIGHT COLUMN: RATINGS LIST & TERMINAL -->
      <div>
        <div class="card">
          <h4 class="card-header">${t("Aspect Scores")}</h4>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${Object.entries(state.aspects).map(([key, val]) => {
              const b = benchmarks[key];
              return `
                <a href="#/aspect/${key}" class="aspect-row" aria-label="${tp("Open {aspect} details", { aspect: aspectLabel(key) })}">
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 500; margin-bottom: 2px;">
                    <span>${aspectLabel(key)} ${confidenceBadge(getAspectConfidence(state, key))} <span class="aspect-row-arrow">&rsaquo;</span></span>
                    <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${val}%</span>
                  </div>
                  <div class="xp-bar-container" style="height: 5px; margin-top: 0;" role="progressbar" aria-label="${aspectLabel(key)}" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100">
                    <div class="xp-bar-fill" style="width: ${val}%; background-color: var(--color-gold);"></div>
                  </div>
                  ${b ? `
                  <div class="benchmark-line" title="${escapeHtml(b.summary)}">
                    ${benchmarkStanding(b, { compact: true })} <span class="benchmark-method">(${METHOD_TAGS[b.method] || b.method})</span>
                  </div>` : ""}
                </a>
              `;
            }).join("")}
          </div>
          <div class="benchmark-sources">
            <details>
              <summary>${t("Benchmark sources & methodology")}</summary>
              <p class="benchmark-disclaimer">
                ${t('Percentiles compare your baseline answers with published population statistics — they are honest approximations, not exact ranks. "Estimate" marks curves calibrated to a published anchor point.')}
              </p>
              <ul>
                ${benchmarkSources.map(src => `
                  <li><a href="${src.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>
                `).join("")}
              </ul>
            </details>
          </div>
        </div>

        <div class="card">
          <h4 class="card-header">${t("Recent Activity")}</h4>
          <div class="terminal" id="dashboard-terminal">
            ${state.history.length === 0 ?
              `<div class="terminal-line"><span class="terminal-accent">> ${t("No logs recorded yet. Ledger is clean.")}</span></div>` :
              state.history.slice(0, 10).map(item => `
                <div class="terminal-line">
                  <span class="terminal-gold">[${new Date(item.timestamp).toLocaleTimeString(dateLocale())}]</span>
                  ${t("Logged:")} <span class="terminal-accent">"${escapeHtml(t(item.actionName))}"</span>${item.quantity ? ` — ${item.quantity.value} ${escapeHtml(t(item.quantity.unit))}` : ""}. ${tp("Reward +{xp} points.", { xp: item.xpReward })}
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;

  renderRadarChart("radar-chart-container", state.aspects);
}

// Shared routine-card markup (ledger + aspect pages).
function actionCard(action, removable) {
  return `
    <div class="action-card" data-id="${escapeHtml(action.id)}" role="button" tabindex="0" aria-label="${tp("Log {title}", { title: escapeHtml(t(action.title)) })}">
      ${removable ? `<button type="button" class="action-remove" data-remove-id="${action.id}" aria-label="${t("Remove routine")}" title="${t("Remove routine")}">✕</button>` : ""}
      <div class="action-title">${escapeHtml(t(action.title))}</div>
      <div class="action-impacts">+${action.xp} points</div>
      <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">${escapeHtml(t(action.desc))}</div>
    </div>`;
}

// Shared click/keyboard binding for routine cards. Quantifiable actions
// ask for the real amount first; others log directly.
function bindActionCards(container, actions, onLogAction) {
  container.querySelectorAll(".action-card").forEach(card => {
    const logIt = () => {
      const action = actions.find(a => a.id === card.getAttribute("data-id"));
      if (!action) return;
      if (action.metric) {
        promptQuantity(action, (value) => {
          onLogAction(action.id, action.title, action.impacts, action.xp,
            { value, unit: action.metric.unit, label: action.metric.label });
        });
      } else {
        onLogAction(action.id, action.title, action.impacts, action.xp);
      }
    };
    card.addEventListener("click", logIt);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        logIt();
      }
    });
  });
}

// 2b. RENDER A DEDICATED ASPECT PAGE (#/aspect/<key>)
export function renderAspectPage(containerId, state, aspectKey, onLogAction, onRefresh) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const detail = getAspectDetail(state, aspectKey);
  if (!detail) return;

  const b = detail.benchmark;
  const suggestions = getAspectSuggestions(state, aspectKey);
  const commitment = state.commitment;
  const isCommittedHere = commitment && commitment.aspect === aspectKey;
  const METHOD_TAGS = {
    distribution: t("vs published norms"),
    threshold: t("vs participation rates"),
    estimate: t("estimate")
  };

  // Routines that positively impact this aspect (presets + custom).
  const relevantActions = [...ACTION_PRESETS, ...(state.customActions || [])]
    .filter(a => (a.impacts[aspectKey] || 0) > 0);

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>

    ${aspectKey === "mental" ? mentalHealthNotice(getMentalHealthNotice(state)) : ""}

    <div class="card aspect-header-card">
      <div>
        <h2 class="aspect-title">${detail.label}</h2>
        <p class="aspect-blurb">${detail.blurb}</p>
        ${detail.confidence && detail.confidence.tier ? `
          <p class="aspect-confidence-line">
            ${confidenceBadge(detail.confidence)}
            <span class="confidence-caption">${tp("{answered}/{total} inputs answered", { answered: detail.confidence.answered, total: detail.confidence.total })}</span>
          </p>` : ""}
      </div>
      <div class="aspect-score-badge">
        <span class="aspect-score-value">${detail.score}</span>
        <span class="aspect-score-max">/100</span>
      </div>
    </div>

    ${detail.confidence && detail.confidence.tier === "estimated" ? `
      <div class="quickstart-note completeness-note">
        <p><strong>${t("Estimated score.")}</strong> ${tp("This score comes from default answers. Answer the {aspect} questions or log routines to confirm it.", { aspect: detail.label })}${
          CHECKIN_ASPECTS.includes(aspectKey) && state.baseline
            ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>`
            : ""
        }</p>
      </div>` : ""}

    <div class="dashboard-grid">
      <div>
        <div class="card">
          <h4 class="card-header">${t("Standing vs Society")}</h4>
          ${b ? `
            <div class="gauge-track" role="progressbar" aria-label="${t("Percentile vs society")}" aria-valuenow="${b.percentile}" aria-valuemin="1" aria-valuemax="99">
              <div class="gauge-fill" style="width: ${b.percentile}%;"></div>
              <div class="gauge-marker" style="left: ${b.percentile}%;"></div>
            </div>
            <div class="gauge-caption">
              ${benchmarkStanding(b)}
              <p class="benchmark-method benchmark-method-line">(${METHOD_TAGS[b.method] || b.method})</p>
            </div>
            <p class="gauge-summary">${escapeHtml(b.summary)}</p>
            ${b.notes.map(n => `<p class="gauge-note">${escapeHtml(n)}</p>`).join("")}
            <div class="benchmark-sources">
              <details>
                <summary>${t("Sources")}</summary>
                <ul>
                  ${b.sources.map(src => `<li><a href="${src.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}
                </ul>
              </details>
            </div>
          ` : `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              ${t("No baseline data for this comparison yet — re-run the onboarding sync to unlock it.")}
            </p>
          `}
        </div>

        <div class="card">
          <h4 class="card-header">${t("Component Breakdown")}</h4>
          ${detail.components.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">${t("Baseline survey data needed for this breakdown.")}</p>
          ` : detail.components.map(c => `
            <div class="component-row">
              <div class="component-head">
                <span>${escapeHtml(c.label)} ${componentConfidenceChip(c.confidence)}</span>
                <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${c.value}</span>
              </div>
              <div class="xp-bar-container" style="height: 5px; margin-top: 0;" role="progressbar" aria-label="${escapeHtml(c.label)}" aria-valuenow="${c.value}" aria-valuemin="0" aria-valuemax="100">
                <div class="xp-bar-fill" style="width: ${c.value}%;"></div>
              </div>
              <div class="component-detail">${escapeHtml(c.detail)}</div>
            </div>
          `).join("")}
        </div>

        ${suggestions.length > 0 ? `
        <div class="card">
          <h4 class="card-header">${t("Suggested Focus")}</h4>
          ${suggestions.map(s => `
            <div class="suggestion-item">
              <div class="suggestion-title">${escapeHtml(s.title)}</div>
              <div class="suggestion-text">${escapeHtml(s.text)}</div>
              <div class="suggestion-meta">${escapeHtml(s.componentLabel)}: ${s.componentValue}/100</div>
            </div>
          `).join("")}
        </div>` : ""}
      </div>

      <div>
        <div class="card">
          <h4 class="card-header">${t("Weekly Commitment")}</h4>
          ${isCommittedHere ? `
            ${commitmentPin(commitment)}
            <button type="button" id="btn-end-commit" class="btn" style="margin-top: 12px; font-size: 0.8rem;">${t("End Commitment")}</button>
          ` : commitment ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              ${tp("You're already committed to {link} this week — one pledge at a time keeps it honest.", {
                link: `<a href="#/aspect/${commitment.aspect}">${aspectLabel(commitment.aspect)}</a>`
              })}
            </p>
          ` : `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 10px;">
              ${tp("Pledge a weekly routine count for {aspect}. Hitting it earns bonus points; the pledge renews every week until you end it.", { aspect: detail.label })}
            </p>
            <form id="commit-form" style="display: flex; gap: 10px; align-items: flex-end;">
              <div class="form-group" style="flex-grow: 1; margin-bottom: 0;">
                <label for="commit-target">${t("Routine logs per week (3-21)")}</label>
                <input type="number" id="commit-target" class="form-control" value="5" min="3" max="21" required>
              </div>
              <button type="submit" class="btn btn-primary">${t("Commit")}</button>
            </form>
          `}
        </div>

        <div class="card">
          <h4 class="card-header">${t("Trend (Weekly Snapshots)")}</h4>
          <div id="aspect-trend-chart"></div>
        </div>

        <div class="card">
          <h4 class="card-header">${tp("Log a {aspect} Routine", { aspect: detail.label })}</h4>
          ${relevantActions.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              ${t("No routines target this aspect yet — register one in the Routines Ledger.")}
            </p>
          ` : `
            <div class="action-grid">
              ${relevantActions.map(a => actionCard(a, false)).join("")}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  renderTrendChart("aspect-trend-chart", detail.trend);
  bindActionCards(container, relevantActions, onLogAction);

  const commitForm = container.querySelector("#commit-form");
  if (commitForm) {
    commitForm.addEventListener("submit", (e) => {
      e.preventDefault();
      stateManager.commitToAspect(aspectKey, parseInt(document.getElementById("commit-target").value));
      if (onRefresh) onRefresh();
    });
  }
  const endCommitBtn = container.querySelector("#btn-end-commit");
  if (endCommitBtn) {
    endCommitBtn.addEventListener("click", () => {
      if (confirm(t("End this week's commitment? Progress will be discarded."))) {
        stateManager.clearCommitment();
        if (onRefresh) onRefresh();
      }
    });
  }
}

// 2c. RENDER THE MONTHLY MINI RE-ASSESSMENT (#/checkin)
export function renderCheckin(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isCoupled = state.profile.relationshipStatus !== "Single";

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 25px;">
        <h1>${t("MONTHLY RE-ASSESSMENT")}</h1>
        <p>${t("Short instruments only • recalibrates Mental, Relationships & Personal Goals")}</p>
      </div>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 20px;">
        ${t("Answer for the recent weeks, not how you felt at onboarding. Scores shift by at most ±15 points per re-assessment, and consistent routine logging since the last one adds a small bonus. Reward: +40 points.")}
      </p>
      <form id="checkin-form">
        ${instrumentBlock("who5")}
        ${instrumentBlock("st5")}
        ${instrumentBlock("ucla")}
        ${isCoupled ? instrumentBlock("ras") : ""}
        ${instrumentBlock("gse")}
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px;">${t("Complete Re-assessment")}</button>
      </form>
      <p id="checkin-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  document.getElementById("checkin-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("checkin-error");
    errorEl.classList.add("d-none");
    try {
      const shifts = stateManager.submitCheckin({
        who5: collectInstrument("who5"),
        st5: collectInstrument("st5"),
        ucla: collectInstrument("ucla"),
        ras: isCoupled ? collectInstrument("ras") : null,
        gse: collectInstrument("gse")
      });
      onComplete(shifts);
    } catch (err) {
      console.error("Check-in submission failed:", err);
      errorEl.textContent = t("Re-assessment Error: ") + err.message;
      errorEl.classList.remove("d-none");
    }
  });
}

// 2d. RENDER THE OPTIONAL IN-DEPTH ASSESSMENT (#/deep)
//
// One card per aspect section, each saved independently so a user can progress
// through the long-form instruments a section at a time. Completing a section
// upgrades that aspect to the "verified" confidence tier and tightens its band.
export function renderDeepAssessment(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const isCoupled = state.profile.relationshipStatus !== "Single";

  const sectionCard = (section) => {
    const done = isAspectDeepVerified(state, section.aspect);
    const keys = deepSectionInstruments(section, isCoupled);
    return `
      <div class="card deep-section ${done ? "deep-section-done" : ""}" id="deep-section-${section.aspect}">
        <div class="deep-section-head">
          <h3 class="card-header">${t(section.title)}</h3>
          ${done ? `<span class="confidence-badge confidence-verified">${t("In-depth")}</span>` : ""}
        </div>
        <p class="onb-why">${t(section.blurb)}</p>
        ${done ? `<p class="deep-done-note">${t("Completed — this aspect's score is verified. You can redo it to update.")}</p>` : ""}
        <form class="deep-form" data-aspect="${section.aspect}" data-keys="${keys.join(",")}">
          ${keys.map(deepInstrumentBlock).join("")}
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 12px;">${done ? t("Update this section") : t("Save this section")}</button>
        </form>
      </div>`;
  };

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>
    <div class="onboarding-container card" style="margin-bottom: 16px;">
      <div class="brand" style="text-align: center; margin-bottom: 18px;">
        <h1>${t("IN-DEPTH ASSESSMENT")}</h1>
        <p>${t("Optional • full-length validated questionnaires • one section at a time")}</p>
      </div>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
        ${t("These longer questionnaires make each aspect's estimate more reliable and tighten its percentile band. Save each section on its own — completed sections are kept as you go. Reward: +60 points per section.")}
      </p>
    </div>
    ${DEEP_SECTIONS.map(sectionCard).join("")}
    <p id="deep-error" class="d-none" style="color: var(--color-crimson); font-weight: 600;"></p>
  `;

  container.querySelectorAll(".deep-form").forEach(form => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("deep-error");
      errorEl.classList.add("d-none");
      try {
        const aspect = form.dataset.aspect;
        const keys = form.dataset.keys.split(",").filter(Boolean);
        const deepData = {};
        keys.forEach(k => { deepData[k] = collectDeepInstrument(k); });
        const result = stateManager.submitDeepAssessment(aspect, deepData);
        onComplete(aspect, result);
      } catch (err) {
        console.error("Deep assessment submission failed:", err);
        errorEl.textContent = t("Assessment Error: ") + err.message;
        errorEl.classList.remove("d-none");
      }
    });
  });
}

// 3. RENDER THE ACTION LEDGER
export function renderLedger(containerId, state, onLogAction, onRoutineChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const customActions = state.customActions || [];

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- ACTIONS LIST -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Log Routine")}</h3>
          <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("Select a routine below to record it. Your aspect scores update automatically (max 5 logs per routine per day).")}
          </p>
          <div class="action-grid">
            ${ACTION_PRESETS.map(a => actionCard(a, false)).join("")}
            ${customActions.map(a => actionCard(a, true)).join("")}
          </div>
        </div>
      </div>

      <!-- CUSTOM ROUTINE CREATOR -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Register New Routine")}</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("Registered routines appear in the routine grid and can be logged like presets.")}
          </p>
          <form id="custom-action-form">
            <div class="form-group">
              <label for="custom-title">${t("Routine Name")}</label>
              <input type="text" id="custom-title" class="form-control" placeholder="${t("E.g., Practice Meditating")}" maxlength="60" required>
            </div>

            <div class="form-group">
              <label for="custom-aspect">${t("Target Aspect")}</label>
              <select id="custom-aspect" class="form-control">
                ${Object.entries(ASPECT_LABELS).map(([key, label]) => `<option value="${key}">${t(label)}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label for="custom-points">${t("Aspect Sync Impact (+1 to +15)")}</label>
              <input type="number" id="custom-points" class="form-control" value="5" min="1" max="15" required>
            </div>

            <div class="form-group">
              <label for="custom-xp">${t("Points Reward (+5 to +50)")}</label>
              <input type="number" id="custom-xp" class="form-control" value="15" min="5" max="50" required>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">${t("Register Routine")}</button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Bind logging clicks (presets + custom routines).
  bindActionCards(container, [...ACTION_PRESETS, ...customActions], onLogAction);

  // Bind remove buttons for custom routines
  container.querySelectorAll(".action-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      stateManager.removeCustomAction(btn.getAttribute("data-remove-id"));
      onRoutineChange();
    });
  });

  // Handle custom routine registration
  document.getElementById("custom-action-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("custom-title").value;
    const aspect = document.getElementById("custom-aspect").value;
    const pts = parseInt(document.getElementById("custom-points").value);
    const xp = parseInt(document.getElementById("custom-xp").value);

    stateManager.addCustomAction(title, aspect, pts, xp);
    onRoutineChange();
  });
}

// Small modal asking for the real measured amount before logging.
function promptQuantity(action, onConfirm) {
  const m = action.metric;
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.innerHTML = `
    <div class="popup-card" style="max-width: 360px;">
      <h3 style="font-family: var(--font-serif); font-weight: 700; margin-bottom: 6px;">${escapeHtml(t(action.title))}</h3>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">${t("Enter the real amount — it becomes part of your measured record.")}</p>
      <div class="form-group" style="text-align: left;">
        <label for="quantity-input">${escapeHtml(t(m.label))} (${escapeHtml(t(m.unit))})</label>
        <input type="number" id="quantity-input" class="form-control" value="${m.default}" min="${m.min}" max="${m.max}" step="${m.step}">
      </div>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
        <button type="button" class="btn btn-quantity-cancel">${t("Cancel")}</button>
        <button type="button" class="btn btn-primary btn-quantity-confirm">${t("Log It")}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#quantity-input");
  input.focus();
  input.select();

  const close = () => overlay.remove();
  const confirm = () => {
    const value = parseFloat(input.value);
    if (!Number.isFinite(value) || value < m.min || value > m.max) {
      input.style.borderColor = "var(--color-crimson)";
      return;
    }
    close();
    onConfirm(value);
  };

  overlay.querySelector(".btn-quantity-cancel").addEventListener("click", close);
  overlay.querySelector(".btn-quantity-confirm").addEventListener("click", confirm);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

// 4. RENDER THE MISSIONS TAB
export function renderQuests(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const active = state.goals.filter(g => !g.completed);
  const completed = state.goals.filter(g => g.completed);

  const progressBar = (goal) => {
    const pct = Math.round((goal.currentValue / goal.targetValue) * 100);
    return `
      <div class="xp-bar-container" style="height: 6px; margin-top: 8px;" role="progressbar" aria-label="${escapeHtml(t(goal.title))}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="xp-bar-fill" style="width: ${pct}%;"></div>
      </div>
      <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-secondary);">${tp("{current} / {target} logged", { current: goal.currentValue, target: goal.targetValue })}</span>`;
  };

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- ACTIVE MISSIONS -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Active Goals")}</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("Goals progress automatically as you log matching routines. Daily goals reset each day, weekly goals each week.")}
          </p>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${active.length === 0 ?
              `<p style="font-style: italic; color: var(--color-text-secondary);">${t("All goals completed. New cycles begin tomorrow.")}</p>` :
              active.map(goal => `
                <div style="border: 1px solid var(--color-card-border); border-radius: 4px; padding: 15px; background: #faf9f6;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="holo-badge">${t(goal.type.toUpperCase())}</span>
                    <strong style="font-size: 1.05rem;">${escapeHtml(t(goal.title))}</strong>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 4px 0 4px 0;">${escapeHtml(t(goal.description))}</p>
                  <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${tp("Aspect: {aspect} • +{xp} points", { aspect: aspectLabel(goal.aspect).toUpperCase(), xp: goal.xpReward })}</span>
                  ${progressBar(goal)}
                  ${goal.milestones ? `
                    <ul style="list-style: none; margin-top: 8px; font-size: 0.8rem; color: var(--color-text-secondary);">
                      ${goal.milestones.map(m => `<li>${m.completed ? "✅" : "⬜"} ${escapeHtml(t(m.text))}</li>`).join("")}
                    </ul>` : ""}
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>

      <!-- COMPLETED LOG -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Completed Goals")}</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${completed.length === 0 ?
              `<p style="font-style: italic; color: var(--color-text-secondary);">${t("No completed goals in this cycle yet.")}</p>` :
              completed.map(goal => `
                <div style="border: 1.5px solid var(--color-nectar); border-radius: 4px; padding: 12px; background: rgba(52,199,89,0.06); display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <span style="font-weight: bold; color: var(--color-nectar);">${escapeHtml(t(goal.title))}</span>
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary);">${tp("Completed: +{xp} points", { xp: goal.xpReward })}</p>
                  </div>
                  <div style="font-size: 1.2rem; color: var(--color-nectar);">✔</div>
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// 5. RENDER LEADERBOARD
export function renderLeaderboard(containerId, state, onRefresh) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const friends = state.friends || [];
  const userEntry = {
    name: tp("{name} (You)", { name: state.profile.name }),
    level: state.profile.level,
    totalPoints: crewPoints(state),
    isUser: true
  };
  const friendEntries = friends.map(f => ({ ...f, isFriend: true }));
  // NPCs pad the board until real crewmates are added.
  const npcEntries = MOCK_COMPETITORS.map(pl => ({ ...pl, isNpc: true }));

  const allPlayers = [...npcEntries, ...friendEntries, userEntry]
    .map(pl => ({ ...pl, rankClass: stateManager.getRankClass(pl.level) }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const myCode = encodeCrewCode(state);

  container.innerHTML = `
    <div style="max-width: 650px; margin: 0 auto;">
      <div class="card">
        <h3 class="card-header">${t("Comparison Codes")}</h3>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 12px;">
          ${t("Peer comparison uses <strong>real people</strong>: share your code with others over LINE or Discord, and paste theirs below. Codes carry only your name, level, points, and aspect scores — nothing private. Re-paste a newer code any time to update a participant.")}
        </p>
        <div class="form-group">
          <label for="my-crew-code">${t("Your Comparison Code")}</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="my-crew-code" class="form-control" value="${myCode}" readonly style="font-family: var(--font-mono); font-size: 0.75rem;">
            <button type="button" id="btn-copy-code" class="btn btn-primary" style="white-space: nowrap;">${t("Copy")}</button>
          </div>
        </div>
        <form id="add-friend-form">
          <div class="form-group">
            <label for="friend-code">${t("Add a participant's code")}</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="friend-code" class="form-control" placeholder="LQ1-..." style="font-family: var(--font-mono); font-size: 0.75rem;" required>
              <button type="submit" class="btn btn-primary" style="white-space: nowrap;">${t("Add")}</button>
            </div>
          </div>
        </form>
        <p id="friend-error" class="d-none" style="color: var(--color-crimson); font-size: 0.85rem; font-weight: 600;"></p>
      </div>

      <div class="card">
        <h3 class="card-header">${t("Peer Comparison")}</h3>
        <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 15px;">
          ${friends.length === 0
            ? t("No participants added yet — sample profiles fill the board until you add codes.")
            : tp(friends.length === 1
                ? "{n} participant added. Sample rows are marked."
                : "{n} participants added. Sample rows are marked.", { n: friends.length })}
        </p>

        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--color-card-border); font-family: var(--font-serif); font-size: 1.05rem; color: var(--color-navy);">
              <th style="padding: 10px;">${t("Rank")}</th>
              <th style="padding: 10px;">${t("Participant")}</th>
              <th style="padding: 10px; text-align: center;">${t("Level")}</th>
              <th style="padding: 10px; text-align: right;">${t("Total Points")}</th>
              <th style="padding: 10px; text-align: center;">${t("Tier")}</th>
            </tr>
          </thead>
          <tbody>
            ${allPlayers.map((player, idx) => {
              const rowStyle = player.isUser ? `background: var(--color-astral-glow); font-weight: bold; border: 1px solid var(--color-gold);` : `border-bottom: 1px solid var(--color-card-border);`;
              const badgeClass = idx === 0 ? `background: var(--color-gold); color: #fff;` : idx === 1 ? `background: #b8b2a6; color: #fff;` : `background: var(--bg-primary); color: var(--color-text-secondary);`;
              return `
                <tr style="${rowStyle}">
                  <td style="padding: 12px 10px;"><span style="border-radius:50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; border: 1px solid var(--color-gold); ${badgeClass}">${idx + 1}</span></td>
                  <td style="padding: 12px 10px;">
                    ${escapeHtml(player.isNpc ? t(player.name) : player.name)}
                    ${player.isNpc ? `<span class="npc-tag">${t("Sample")}</span>` : ""}
                    ${player.isFriend ? `<button type="button" class="friend-remove" data-friend-id="${escapeHtml(player.id)}" aria-label="${tp("Remove {name}", { name: escapeHtml(player.name) })}" title="${t("Remove participant")}">✕</button>` : ""}
                  </td>
                  <td style="padding: 12px 10px; text-align: center; font-family: var(--font-mono);">${escapeHtml(player.level)}</td>
                  <td style="padding: 12px 10px; text-align: right; font-family: var(--font-mono);">${escapeHtml(player.totalPoints)}</td>
                  <td style="padding: 12px 10px; text-align: center;"><span class="holo-badge">${player.rankClass}</span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Copy own code (clipboard API with select-fallback for older browsers).
  document.getElementById("btn-copy-code").addEventListener("click", async () => {
    const input = document.getElementById("my-crew-code");
    input.select();
    try {
      await navigator.clipboard.writeText(myCode);
    } catch {
      document.execCommand("copy");
    }
    const btn = document.getElementById("btn-copy-code");
    btn.textContent = t("Copied!");
    setTimeout(() => { btn.textContent = t("Copy"); }, 1500);
  });

  document.getElementById("add-friend-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("friend-error");
    errorEl.classList.add("d-none");
    try {
      const friend = decodeCrewCode(document.getElementById("friend-code").value);
      const result = stateManager.addFriend(friend);
      if (!result.ok) throw new Error(result.reason);
      if (onRefresh) onRefresh();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("d-none");
    }
  });

  container.querySelectorAll(".friend-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      stateManager.removeFriend(btn.getAttribute("data-friend-id"));
      if (onRefresh) onRefresh();
    });
  });
}
