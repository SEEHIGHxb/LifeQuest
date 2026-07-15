// views/instrument-forms.js - form builders and readers for the survey
// instruments (onboarding, monthly check-in, and deep assessment). Moved
// verbatim from the old monolithic ui.js; behavior unchanged.

import { INSTRUMENTS, DEEP_INSTRUMENTS } from "../surveys.js";
import { t } from "../i18n.js";

export function numberField(id, label, value, attrs = "") {
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

export function instrumentBlock(instrKey) {
  const instr = INSTRUMENTS[instrKey];
  return `
    <div class="instrument-block">
      <p class="instrument-title">${t(instr.title)}</p>
      ${instr.items.map((item, i) => radioQuestion(instrKey, i, item)).join("")}
    </div>`;
}

export function collectInstrument(instrKey) {
  return INSTRUMENTS[instrKey].items.map((item, i) => {
    const el = document.querySelector(`input[name="${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : item.def;
  });
}

// Deep-assessment instruments live in DEEP_INSTRUMENTS and use a "deep-" name
// prefix so their radios never collide with an onboarding form on the page.
export function deepInstrumentBlock(instrKey) {
  const instr = DEEP_INSTRUMENTS[instrKey];
  return `
    <div class="instrument-block">
      <p class="instrument-title">${t(instr.title)}</p>
      ${instr.items.map((item, i) => radioQuestion(`deep-${instrKey}`, i, item)).join("")}
    </div>`;
}

export function collectDeepInstrument(instrKey) {
  return DEEP_INSTRUMENTS[instrKey].items.map((item, i) => {
    const el = document.querySelector(`input[name="deep-${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : item.def;
  });
}
