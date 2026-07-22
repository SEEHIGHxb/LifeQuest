// views/quests.js - the Goals tab: weekly quantity pledges ("average at least
// 2 L of water a day"), graded automatically by the weekly review. Everything
// user-facing on a pledge derives from its template — nothing stored is
// user-authored, so there is nothing here to escape except ids in attributes.

import { stateManager } from "../state.js";
import { t, tp } from "../i18n.js";
import { GOAL_TEMPLATES, goalTemplate, PLEDGE_LIMIT } from "../goals.js";
import { getAllBenchmarks } from "../benchmarks.js";
import { gradeAllAspects } from "../grades.js";
import { rankPledgesByGrade, isPriorityPledge } from "../suggestions.js";
import { escapeHtml, aspectLabel } from "./helpers.js";

function pledgeCard(goal) {
  const tmpl = goalTemplate(goal.templateId);
  if (!tmpl) return "";
  // The import sanitizer already coerces target/value/streak to numbers, but
  // the sink still escapes them (belt AND suspenders — same posture as every
  // other view): a hostile value that somehow reached here stays inert text.
  const last = goal.lastResult;
  const resultLine = last
    ? (last.met
        ? `<span style="color: var(--color-nectar); font-weight: 600;">✓ ${tp("Met last week ({value} {unit})", { value: escapeHtml(last.value), unit: t(tmpl.unit) })}</span>`
        : `<span style="color: var(--color-crimson); font-weight: 600;">✗ ${tp("Missed last week ({value} {unit})", { value: escapeHtml(last.value), unit: t(tmpl.unit) })}</span>`)
    : `<span style="color: var(--color-text-secondary);">${t("Graded at your next weekly review.")}</span>`;
  const streak = goal.streak >= 2
    ? ` <span class="holo-badge">${tp("{n}-week streak", { n: escapeHtml(goal.streak) })}</span>`
    : "";
  return `
    <div style="border: 1px solid var(--color-card-border); border-radius: 4px; padding: 15px; background: #faf9f6;">
      <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span class="holo-badge">${aspectLabel(tmpl.aspect).toUpperCase()}</span>
          <strong style="font-size: 1.05rem;">${t(tmpl.title)}</strong>${streak}
        </div>
        <button type="button" class="btn pledge-remove" data-pledge-id="${escapeHtml(goal.id)}" style="font-size: 0.75rem; padding: 2px 10px;">${t("Remove")}</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 4px 0;">${tp(tmpl.desc, { target: escapeHtml(goal.target) })}</p>
      <p style="font-size: 0.8rem; margin: 4px 0 0;">${resultLine}</p>
      <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${tp("+{xp} points each week it's met", { xp: tmpl.xp })}</span>
    </div>`;
}

// 4. RENDER THE GOALS TAB (weekly pledges)
export function renderQuests(containerId, state, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pledges = state.goals;
  // Order the catalog so pledges for the user's lowest-graded aspects lead —
  // the neediest one is first, and so pre-selected in the form. Grades come
  // from the same benchmarks the dashboard grades on. A bare state (no
  // profile, e.g. hostile-input tests) grades nothing, so the order is the
  // plain catalog order.
  const grades = state.profile ? gradeAllAspects(getAllBenchmarks(state)) : {};
  const availableIds = rankPledgesByGrade(
    Object.keys(GOAL_TEMPLATES).filter(id => !pledges.some(g => g.templateId === id)),
    grades
  );
  const available = availableIds.map(id => [id, goalTemplate(id)]);
  const canAdd = pledges.length < PLEDGE_LIMIT && available.length > 0;
  const hasPriorityPledge = availableIds.some(id => isPriorityPledge(id, grades));

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- ACTIVE PLEDGES -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Weekly Pledges")}</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("A pledge is a weekly quantity target. Your weekly review grades every pledge automatically — nothing to log day to day.")}
          </p>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${pledges.length === 0
              ? `<p style="font-style: italic; color: var(--color-text-secondary);">${t("No pledges yet — add one from the catalog.")}</p>`
              : pledges.map(pledgeCard).join("")}
          </div>
        </div>
      </div>

      <!-- ADD A PLEDGE -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Add a Pledge")}</h3>
          ${canAdd && hasPriorityPledge ? `
            <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 12px;">
              ${t("Pledges for the aspects you're graded lowest on are listed first.")}
            </p>` : ""}
          ${canAdd ? `
            <form id="pledge-form">
              <div class="form-group">
                <label for="pledge-template">${t("Pledge type")}</label>
                <select id="pledge-template" class="form-control">
                  ${available.map(([id, tmpl]) => `<option value="${id}">${t(tmpl.title)}</option>`).join("")}
                </select>
              </div>
              <div class="form-group">
                <label for="pledge-target">${t("Weekly target")} (<span id="pledge-unit"></span>)</label>
                <input type="number" id="pledge-target" class="form-control" required>
              </div>
              <p id="pledge-desc" style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 10px;"></p>
              <button type="submit" class="btn btn-primary" style="width: 100%;">${t("Add Pledge")}</button>
              <p id="pledge-error" class="d-none" style="color: var(--color-crimson); margin-top: 10px; font-weight: 600;"></p>
            </form>
          ` : `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              ${pledges.length >= PLEDGE_LIMIT
                ? tp("Pledge list is full (max {max}).", { max: PLEDGE_LIMIT })
                : t("Every pledge type is already in use.")}
            </p>
          `}
        </div>
      </div>
    </div>
  `;

  // Remove buttons.
  container.querySelectorAll(".pledge-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm(t("Remove this pledge? Its streak will be lost."))) {
        stateManager.removePledge(btn.getAttribute("data-pledge-id"));
        if (onChange) onChange();
      }
    });
  });

  // Add form: keep the target input's bounds and hint in sync with the
  // selected template.
  const form = container.querySelector("#pledge-form");
  if (form) {
    const select = form.querySelector("#pledge-template");
    const target = form.querySelector("#pledge-target");
    const unitEl = form.querySelector("#pledge-unit");
    const descEl = form.querySelector("#pledge-desc");

    const syncTemplate = () => {
      const tmpl = goalTemplate(select.value);
      if (!tmpl) return;
      target.min = tmpl.min;
      target.max = tmpl.max;
      target.step = tmpl.step;
      target.value = tmpl.def;
      unitEl.textContent = t(tmpl.unit);
      descEl.textContent = tp(tmpl.desc, { target: tmpl.def });
    };
    select.addEventListener("change", syncTemplate);
    syncTemplate();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errorEl = form.querySelector("#pledge-error");
      errorEl.classList.add("d-none");
      const result = stateManager.addPledge(select.value, parseFloat(target.value));
      if (result.ok) {
        if (onChange) onChange();
      } else {
        errorEl.textContent = result.reason;
        errorEl.classList.remove("d-none");
      }
    });
  }
}
