// views/profile.js - the Profile & Data page (#/profile).
//
// One place to hand-edit the SLOW-MOVING facts about the user — name, age,
// gender, region, employment, relationship status, income, body metrics,
// digital literacy, long-term investments, and birthday. The fast,
// behaviour-driven quantities (sleep, water, activity, plastics, donations...)
// are deliberately NOT here: those are measured once a week in the Weekly
// Review, not typed in on demand.
//
// Score-affecting edits (income, region, age, weight/height, investments) are
// re-measured through the same formulas onboarding uses and applied as deltas
// by stateManager.updateProfile — see the note there. Gender and employment
// move only benchmarks/recommendations, and a relationship-status flip refines
// the relationships score at the next monthly check-in (no RAS answers exist to
// recompute it now); the UI says both of these out loud.
//
// This page is also the home of the data controls (Export / Import / Reset),
// relocated from the header. Those buttons keep the ids the existing app.js
// handlers expect, and app.js binds them after this view renders.

import { stateManager } from "../state.js";
import { numberField } from "./instrument-forms.js";
import { birthdayFields, escapeHtml } from "./helpers.js";
import { validateProfile } from "../validation.js";
import { sanitizeBirthday } from "../sanitize.js";
import { t, tp } from "../i18n.js";

const AGE_MIN = 15;
const AGE_MAX = 100;

// field name (as validateProfile / the birthday check reports it) -> the id of
// its inline <span class="field-error"> in the DOM.
const ERR_IDS = {
  income: "pf-income-err", weight: "pf-weight-err", height: "pf-height-err",
  digitalLiteracy: "pf-digital-err", age: "pf-age-err", birthday: "pf-birthday-err"
};

// A labelled <select> prefilled to `current`. options: [{ value, label }].
function selectField(id, label, options, current) {
  const opts = options.map(o =>
    `<option value="${escapeHtml(o.value)}"${o.value === current ? " selected" : ""}>${o.label}</option>`
  ).join("");
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <select id="${id}" class="form-control">${opts}</select>
    </div>`;
}

// A labelled text input, value HTML-escaped (name is user-authored free text).
function textField(id, label, value, attrs = "") {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input type="text" id="${id}" class="form-control" value="${escapeHtml(value)}" ${attrs}>
      <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
    </div>`;
}

export function renderProfile(containerId, state, onSaved) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const p = state.profile;

  const genderOpts = [
    { value: "unspecified", label: t("Prefer not to say") },
    { value: "male", label: t("Male") },
    { value: "female", label: t("Female") }
  ];
  const regionOpts = [
    { value: "Provinces", label: t("Provinces / Upcountry Thailand") },
    { value: "Bangkok", label: t("Bangkok & Vicinity") }
  ];
  const employmentOpts = [
    { value: "Office Worker", label: t("Office Worker / Salary Employee") },
    { value: "Freelancer", label: t("Freelancer / Independent") },
    { value: "Business Owner", label: t("Business Owner / Entrepreneur") },
    { value: "Unemployed", label: t("Unemployed / Looking for Work") },
    { value: "Student", label: t("Student") }
  ];
  const relationshipOpts = [
    { value: "Single", label: t("Single") },
    { value: "Coupled", label: t("In a Relationship / Married") }
  ];
  const pensionOpts = [
    { value: "false", label: t("No, not yet planning pension") },
    { value: "true", label: t("Yes, retirement assets secured") }
  ];

  container.innerHTML = `
    <div class="profile-view">
      <div class="card">
        <h2 class="card-header">${t("Your Profile")}</h2>
        <p class="onb-why">${t("Update the slower-moving facts about you. Day-to-day quantities like sleep, water, and activity live in the Weekly Review.")}</p>

        <h3 class="instrument-title">${t("Identity")}</h3>
        ${textField("pf-name", t("Name"), p.name, 'maxlength="40"')}
        <div class="grid-2">
          ${numberField("pf-age", t("Age"), p.age, `min="${AGE_MIN}" max="${AGE_MAX}"`)}
          ${selectField("pf-gender", t("Gender (for benchmark norms)"), genderOpts, p.gender)}
        </div>
        ${birthdayFields({ idPrefix: "pf-birthday", month: p.birthMonth, day: p.birthDay })}
        <span class="field-error d-none" id="pf-birthday-err" aria-live="polite"></span>
        <p class="profile-note">${t("Optional — month and day only, so the app knows when your year turns. Your birth year is never asked for and never stored.")}</p>

        <h3 class="instrument-title">${t("Life Context")}</h3>
        ${selectField("pf-region", t("Primary Region (Cost of Living Mapping)"), regionOpts, p.region)}
        ${selectField("pf-employment", t("Employment Status"), employmentOpts, p.employment)}
        ${selectField("pf-relationship", t("Relationship Status"), relationshipOpts, p.relationshipStatus)}
        <p class="profile-note">${t("Change this and your recommendations update now; your relationship score refines at your next monthly check-in.")}</p>
        <p class="profile-note">${t("Gender and employment guide your benchmarks and recommendations — they don't change your scores.")}</p>

        <h3 class="instrument-title">${t("Finance & Body")}</h3>
        ${numberField("pf-income", t("Monthly Individual Income (Net THB)"), p.income, 'min="0"')}
        <div class="grid-2">
          ${numberField("pf-height", t("Height (cm)"), p.height, 'min="100" max="250"')}
          ${numberField("pf-weight", t("Weight (kg)"), p.weight, 'min="25" max="300"')}
        </div>
        ${numberField("pf-digital", t("Digital Literacy Self-Rating (0-100)"), p.digitalLiteracy, 'min="0" max="100"')}
        ${selectField("pf-pension", t("Long-term pension / retirement products (SSF, RMF, stock portfolio)?"), pensionOpts, p.longTermInvestments ? "true" : "false")}

        <p id="profile-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
        <button type="button" id="pf-save" class="btn btn-primary" style="margin-top: 8px;">${t("Save changes")}</button>
      </div>

      <div class="card">
        <h3 class="card-header">${t("Data & Backup")}</h3>
        <p class="onb-why">${t("Your data lives only in this browser. Export a backup regularly — clearing site data erases it.")}</p>
        <div class="profile-data-actions">
          <button id="btn-export-data" class="btn">${t("Export")}</button>
          <button id="btn-import-data" class="btn">${t("Import")}</button>
          <button id="btn-reset-data" class="btn btn-danger">${t("Reset Data")}</button>
          <input type="file" id="import-file-input" accept="application/json,.json" class="d-none">
        </div>
      </div>
    </div>
  `;

  const clearErrors = () => {
    for (const id of Object.values(ERR_IDS)) {
      const el = document.getElementById(id);
      if (el) { el.textContent = ""; el.classList.add("d-none"); }
    }
    const err = document.getElementById("profile-error");
    if (err) err.classList.add("d-none");
  };

  const showFieldError = (field, message) => {
    const el = document.getElementById(ERR_IDS[field]);
    if (el) { el.textContent = message; el.classList.remove("d-none"); }
  };

  document.getElementById("pf-save").addEventListener("click", () => {
    clearErrors();
    const val = id => document.getElementById(id)?.value ?? "";
    const errors = {};

    // Numeric fields validated against the shared FIELD_CONSTRAINTS.
    const { errors: numErrors } = validateProfile({
      income: val("pf-income"), weight: val("pf-weight"),
      height: val("pf-height"), digitalLiteracy: val("pf-digital")
    });
    Object.assign(errors, numErrors);

    // Age isn't a FIELD_CONSTRAINTS key — bound it explicitly.
    const ageNum = Number(val("pf-age"));
    if (!Number.isFinite(ageNum) || ageNum < AGE_MIN || ageNum > AGE_MAX) {
      errors.age = tp("Enter a value between {min} and {max}.", { min: AGE_MIN, max: AGE_MAX });
    }

    // Birthday: both-or-neither, and a real calendar date. Blank keeps the
    // current birthday (there is no "unset" path anywhere in the app).
    const bMonth = val("pf-birthday-month");
    const bDay = String(val("pf-birthday-day")).trim();
    const monthFilled = bMonth !== "";
    const dayFilled = bDay !== "";
    let birthdayChange = null;
    if (monthFilled !== dayFilled) {
      errors.birthday = t("Choose both a month and a day, or leave both blank.");
    } else if (monthFilled && dayFilled) {
      const b = sanitizeBirthday(parseInt(bMonth), parseInt(bDay));
      if (!b.birthMonth) errors.birthday = t("That isn't a real date — check the day for that month.");
      else if (b.birthMonth !== p.birthMonth || b.birthDay !== p.birthDay) birthdayChange = b;
    }

    if (Object.keys(errors).length) {
      for (const [field, message] of Object.entries(errors)) showFieldError(field, message);
      const err = document.getElementById("profile-error");
      err.textContent = t("Please fix the highlighted fields before continuing.");
      err.classList.remove("d-none");
      return;
    }

    const result = stateManager.updateProfile({
      name: val("pf-name"), age: val("pf-age"),
      gender: val("pf-gender"), region: val("pf-region"),
      employment: val("pf-employment"), relationshipStatus: val("pf-relationship"),
      income: val("pf-income"), weight: val("pf-weight"), height: val("pf-height"),
      digitalLiteracy: val("pf-digital"), longTermInvestments: val("pf-pension")
    });
    // Birthday rides its own mutator (re-anchors level-ups safely).
    if (birthdayChange) stateManager.setBirthday(birthdayChange.birthMonth, birthdayChange.birthDay);

    if (typeof onSaved === "function") onSaved(result);
  });
}
