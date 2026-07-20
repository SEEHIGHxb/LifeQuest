// views/aspect.js - dedicated aspect page (#/aspect/<key>): percentile gauge,
// component breakdown, suggestions, weekly measurement, and trend chart.

import { stateManager } from "../state.js";
import { renderTrendChart } from "../chart.js";
import { getAspectDetail } from "../aspects.js";
import { getAspectSuggestions, getMentalHealthNotice } from "../suggestions.js";
import { t, tp } from "../i18n.js";
import { gradeForBenchmark } from "../grades.js";
import {
  escapeHtml, confidenceBadge, componentConfidenceChip, gradeBadge,
  benchmarkStanding, methodTag, mentalHealthNotice, CHECKIN_ASPECTS
} from "./helpers.js";

// The weekly-review inputs that re-measure each aspect. Mental and
// relationships are survey-measured (monthly re-assessment), not weekly —
// they are absent here on purpose.
const WEEKLY_MEASURED = {
  finance: "Savings rate",
  physical: "Exercise days and minutes, sleep, water, vegetables",
  personalGoals: "Learning hours",
  socialContribution: "Donations and volunteering hours",
  environment: "Single-use plastic items",
  humanityFuture: "Learning hours"
};

// 2b. RENDER A DEDICATED ASPECT PAGE (#/aspect/<key>)
export function renderAspectPage(containerId, state, aspectKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const detail = getAspectDetail(state, aspectKey);
  if (!detail) return;

  const b = detail.benchmark;
  const grade = gradeForBenchmark(b);
  const suggestions = getAspectSuggestions(state, aspectKey);

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
        ${gradeBadge(grade)}
      </div>
    </div>

    ${grade ? `
      <div class="card grade-explainer">
        <p><strong>${tp("Grade {letter}", { letter: grade.grade })}</strong> — ${tp("{band} of people like you, from the population comparison below.", { band: t(grade.label) })}</p>
        <p class="grade-explainer-note">${t("Grades come from the cited percentile, not from the 0-100 score — the score is this app's own composite, while the percentile is the part that compares you with real published data.")}</p>
      </div>` : `
      <div class="card grade-explainer">
        <p><strong>${t("Not graded yet.")}</strong> ${t("This aspect is graded from its population comparison, which needs its questionnaires answered first.")}${
          CHECKIN_ASPECTS.includes(aspectKey) && state.baseline
            ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>`
            : ""
        }</p>
      </div>`}

    ${detail.confidence && detail.confidence.tier === "estimated" ? `
      <div class="quickstart-note completeness-note">
        <p><strong>${t("Estimated score.")}</strong> ${tp("This score comes from default answers. Answer the {aspect} questions or log routines to confirm it.", { aspect: detail.label })}${
          CHECKIN_ASPECTS.includes(aspectKey) && state.baseline
            ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>`
            : ""
        }</p>
      </div>` : ""}

    ${detail.flaggedInstruments && detail.flaggedInstruments.length > 0 ? `
      <div class="quickstart-note completeness-note">
        <p><strong>${t("Uniform answers detected.")}</strong> ${t("Some questionnaire answers all sat on the same option, so they are not counted as a confirmed measurement. Re-answer them honestly to confirm this score.")}</p>
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
              <p class="benchmark-method benchmark-method-line">(${methodTag(b.method)})</p>
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
          <h4 class="card-header">${t("Measured Weekly")}</h4>
          ${WEEKLY_MEASURED[aspectKey] ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 10px;">
              ${tp("Your weekly review re-measures this aspect from: {fields}.", { fields: t(WEEKLY_MEASURED[aspectKey]) })}
            </p>
            ${stateManager.isWeeklyReviewDue()
              ? `<a href="#/review" class="btn btn-primary" style="font-size: 0.85rem;">${t("Start Weekly Review")}</a>`
              : `<p style="font-size: 0.85rem; color: var(--color-text-secondary);">${t("Reviewed this week — the next review opens next week.")}</p>`}
          ` : `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 10px;">
              ${t("This aspect is measured by its questionnaires rather than weekly quantities — update it at the monthly re-assessment.")}
            </p>
            ${state.baseline ? `<a href="#/checkin" class="btn btn-primary" style="font-size: 0.85rem;">${t("Start Re-assessment")}</a>` : ""}
          `}
        </div>

        <div class="card">
          <h4 class="card-header">${t("Trend (Weekly Snapshots)")}</h4>
          <div id="aspect-trend-chart"></div>
        </div>
      </div>
    </div>
  `;

  renderTrendChart("aspect-trend-chart", detail.trend);
}
