// views/assessments.js - the monthly mini re-assessment (#/checkin) and the
// optional in-depth assessment (#/deep). Moved verbatim from the old
// monolithic ui.js; behavior unchanged.

import { stateManager } from "../state.js";
import { DEEP_SECTIONS, deepSectionInstruments } from "../surveys.js";
import { isAspectDeepVerified } from "../aspects.js";
import { t } from "../i18n.js";
import {
  instrumentBlock, collectInstrument,
  deepInstrumentBlock, collectDeepInstrument
} from "./instrument-forms.js";

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
