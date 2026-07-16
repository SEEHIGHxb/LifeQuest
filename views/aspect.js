// views/aspect.js - dedicated aspect page (#/aspect/<key>): percentile gauge,
// component breakdown, suggestions, weekly commitment, trend chart, and
// one-tap logging. Moved verbatim from the old monolithic ui.js.

import { stateManager } from "../state.js";
import { renderTrendChart } from "../chart.js";
import { getAspectDetail } from "../aspects.js";
import { getAspectSuggestions, getMentalHealthNotice } from "../suggestions.js";
import { t, tp } from "../i18n.js";
import { ACTION_PRESETS } from "./actions.js";
import {
  escapeHtml, aspectLabel, confidenceBadge, componentConfidenceChip,
  benchmarkStanding, methodTag, commitmentPin, mentalHealthNotice,
  actionCard, bindActionCards, CHECKIN_ASPECTS
} from "./helpers.js";

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
