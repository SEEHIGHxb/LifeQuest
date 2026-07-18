// views/review.js - the Weekly Review tab (#/review): ONE measured
// self-report per ISO week replaces the old daily activity logging. The form
// asks for rough weekly quantities ("about 2 L of water a day"), prefilled
// with the current profile values so an unchanged week takes seconds; the
// submission re-measures the behavior-driven aspects through the shared
// scoring formulas and grades every pledge at once.

import { stateManager } from "../state.js";
import { validateProfile, FIELD_CONSTRAINTS } from "../validation.js";
import { t, tp, dateLocale } from "../i18n.js";
import { numberField } from "./instrument-forms.js";
import { aspectLabel } from "./helpers.js";

// Form ids are "rev-<profileField>" so errors from validateProfile (keyed by
// field name) map straight onto the numberField error spans.
const FIELD_IDS = {
  weeklyVigorousDays: "rev-weeklyVigorousDays",
  weeklyVigorousMins: "rev-weeklyVigorousMins",
  weeklyModerateDays: "rev-weeklyModerateDays",
  weeklyModerateMins: "rev-weeklyModerateMins",
  weeklyWalkingDays: "rev-weeklyWalkingDays",
  weeklyWalkingMins: "rev-weeklyWalkingMins",
  sleepHours: "rev-sleepHours",
  waterLiters: "rev-waterLiters",
  vegetablePortions: "rev-vegetablePortions",
  weeklyLearningHours: "rev-weeklyLearningHours",
  singleUsePlastics: "rev-singleUsePlastics",
  savingsRate: "rev-savingsRate",
  monthlyDonations: "rev-monthlyDonations",
  volunteeringHours: "rev-volunteeringHours"
};

// The onboarding label strings are reused verbatim so the review form needs no
// new translations and the two forms can never phrase the same field two ways.
const FIELD_LABELS = {
  weeklyVigorousDays: "Vigorous Exercise (Days/Week)",
  weeklyVigorousMins: "Vigorous Minutes per Day",
  weeklyModerateDays: "Moderate Exercise (Days/Week)",
  weeklyModerateMins: "Moderate Minutes per Day",
  weeklyWalkingDays: "Walking (Days/Week)",
  weeklyWalkingMins: "Walking Minutes per Day",
  sleepHours: "Average Nightly Sleep (Hours)",
  waterLiters: "Water Intake per Day (Liters)",
  vegetablePortions: "Vegetable/Fruit Portions per Day",
  weeklyLearningHours: "Weekly Learning / Study Hours",
  singleUsePlastics: "Single-Use Plastic Items per Day",
  savingsRate: "Monthly Savings Rate (% of Income)",
  monthlyDonations: "Monthly Donations (THB)",
  volunteeringHours: "Volunteering Hours per Month"
};

const FIELD_STEPS = { sleepHours: 0.5, waterLiters: 0.1, weeklyLearningHours: 0.5, volunteeringHours: 0.5 };

function reviewField(field, profile) {
  const c = FIELD_CONSTRAINTS[field];
  const step = FIELD_STEPS[field] ? ` step="${FIELD_STEPS[field]}"` : "";
  const value = profile[field] ?? 0;
  return numberField(FIELD_IDS[field], t(FIELD_LABELS[field]), value, `min="${c.min}" max="${c.max}"${step}`);
}

// Next ISO week starts on the coming Monday.
function nextReviewDate() {
  const d = new Date();
  const sinceMonday = (d.getDay() + 6) % 7;
  const next = new Date(d);
  next.setDate(d.getDate() + (7 - sinceMonday));
  return next.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

function shiftSummary(shifts) {
  const parts = Object.entries(shifts || {})
    .map(([key, v]) => `${aspectLabel(key)} ${v > 0 ? "+" : ""}${v}`);
  return parts.length ? parts.join(" · ") : t("scores steady");
}

function reviewHistory(reviews) {
  if (!reviews.length) return "";
  const rows = reviews.slice(-8).reverse().map(r => {
    const met = r.goals.filter(g => g.met).length;
    return `
      <div class="terminal-line">
        <span class="terminal-gold">[${new Date(r.date).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })}]</span>
        ${shiftSummary(r.shifts)} · ${tp("{met}/{total} pledges met", { met, total: r.goals.length })} · ${tp("+{xp} points", { xp: r.xp })}
      </div>`;
  }).join("");
  return `
    <div class="card">
      <h4 class="card-header">${t("Past Reviews")}</h4>
      <div class="terminal">${rows}</div>
    </div>`;
}

export function renderReview(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const due = stateManager.isWeeklyReviewDue();

  if (!due) {
    const checkinDue = stateManager.isCheckinDue();
    container.innerHTML = `
      <div class="card">
        <h3 class="card-header">${t("Weekly Review")}</h3>
        <p style="font-size: 0.95rem; margin-bottom: 6px;">✅ <strong>${t("Reviewed this week.")}</strong></p>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
          ${tp("Nothing to do here until {date} — live your week; the app can wait.", { date: nextReviewDate() })}
        </p>
        ${checkinDue ? `
          <p style="font-size: 0.85rem; margin-top: 10px;">
            ${t("One thing while you're here: the monthly re-assessment is due.")}
            <a href="#/checkin">${t("Start Re-assessment")}</a>
          </p>` : ""}
      </div>
      ${reviewHistory(state.reviews)}
    `;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h3 class="card-header">${t("Weekly Review")}</h3>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
        ${t("Report a rough weekly average for each habit — no daily logging needed. Every value is prefilled with last week's answer, so only touch what changed. Takes about two minutes.")}
      </p>
      <form id="weekly-review-form">
        <h4 class="card-header" style="margin-top: 4px;">${t("Activity this week")}</h4>
        <div class="grid-2">
          ${reviewField("weeklyVigorousDays", state.profile)}
          ${reviewField("weeklyVigorousMins", state.profile)}
        </div>
        <div class="grid-2">
          ${reviewField("weeklyModerateDays", state.profile)}
          ${reviewField("weeklyModerateMins", state.profile)}
        </div>
        <div class="grid-2">
          ${reviewField("weeklyWalkingDays", state.profile)}
          ${reviewField("weeklyWalkingMins", state.profile)}
        </div>

        <h4 class="card-header">${t("Daily habits (weekly average)")}</h4>
        <div class="grid-2">
          ${reviewField("sleepHours", state.profile)}
          ${reviewField("waterLiters", state.profile)}
        </div>
        <div class="grid-2">
          ${reviewField("vegetablePortions", state.profile)}
          ${reviewField("singleUsePlastics", state.profile)}
        </div>
        <div class="grid-2">
          ${reviewField("weeklyLearningHours", state.profile)}
          ${reviewField("savingsRate", state.profile)}
        </div>

        <details style="margin: 10px 0;">
          <summary style="cursor: pointer; font-weight: 600; font-size: 0.9rem;">${t("Monthly habits (update when they change)")}</summary>
          <div class="grid-2" style="margin-top: 10px;">
            ${reviewField("monthlyDonations", state.profile)}
            ${reviewField("volunteeringHours", state.profile)}
          </div>
        </details>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">${t("Complete Weekly Review")}</button>
      </form>
      <p id="review-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
    ${reviewHistory(state.reviews)}
  `;

  document.getElementById("weekly-review-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("review-error");
    errorEl.classList.add("d-none");

    const inputs = {};
    for (const [field, id] of Object.entries(FIELD_IDS)) {
      inputs[field] = document.getElementById(id)?.value;
    }

    // Same inline-error pattern as onboarding: per-field messages + a banner.
    const { ok, errors } = validateProfile(inputs);
    for (const id of Object.values(FIELD_IDS)) {
      const span = document.getElementById(`${id}-err`);
      if (span) { span.textContent = ""; span.classList.add("d-none"); }
    }
    if (!ok) {
      for (const [field, message] of Object.entries(errors)) {
        const span = document.getElementById(`${FIELD_IDS[field]}-err`);
        if (span) { span.textContent = message; span.classList.remove("d-none"); }
      }
      errorEl.textContent = t("Please fix the highlighted fields before continuing.");
      errorEl.classList.remove("d-none");
      return;
    }

    onComplete(stateManager.submitWeeklyReview(inputs));
  });
}
