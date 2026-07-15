// views/onboarding.js - the six-step baseline assessment (onboarding) view.
// Moved verbatim from the old monolithic ui.js; behavior unchanged.

import { stateManager } from "../state.js";
import { validateProfile, buildProvidedFlags, buildAnsweredFlags } from "../validation.js";
import { numberField, instrumentBlock, collectInstrument } from "./instrument-forms.js";
import { t, tp } from "../i18n.js";

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
          ${numberField("onb-age", t("Age"), 25, 'min="15" max="100"')}
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
        ${numberField("onb-plastics", t("Single-Use Plastic Items per Day"), 3, 'min="0" max="100"')}
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
