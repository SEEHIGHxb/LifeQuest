// views/dashboard.js - the Overview tab: status card, radar chart, aspect
// scores with benchmark standings, recommendations, and recent activity.
// Moved verbatim from the old monolithic ui.js; behavior unchanged.

import { stateManager } from "../state.js";
import { renderRadarChart } from "../chart.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { getAllBenchmarks, collectSources } from "../benchmarks.js";
import { getAspectConfidence, ASPECT_KEYS, isAspectDeepVerified } from "../aspects.js";
import { getTopSuggestions, getMentalHealthNotice } from "../suggestions.js";
import { balanceIndex, balanceBand, weakestAspect, gradeAllAspects } from "../grades.js";
import { seasonPace } from "../season.js";
import { t, tp, dateLocale } from "../i18n.js";
import {
  escapeHtml, aspectLabel, confidenceBadge, benchmarkStanding, methodTag,
  estimatedAspects, mentalHealthNotice, gradeBadge, balanceIndexBlock, CHECKIN_ASPECTS
} from "./helpers.js";

// Shared markup for one suggestion entry.
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

// 2. RENDER THE MAIN DASHBOARD
export function renderDashboard(containerId, state, onExportBackup) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const p = state.profile;
  const pace = seasonPace(p.season);
  const benchmarks = getAllBenchmarks(state);
  const benchmarkSources = collectSources(benchmarks);
  const grades = gradeAllAspects(benchmarks);
  const index = balanceIndex(state.aspects);
  const indexBand = balanceBand(index);
  const weakest = weakestAspect(state.aspects);
  const suggestions = getTopSuggestions(state, 3);
  const checkinDue = stateManager.isCheckinDue();
  const reviewDue = stateManager.isWeeklyReviewDue();
  // A soft ask, shown once until it is answered or waved off. Without a
  // birthday the level can never advance, so the question matters — but a
  // blocking modal over someone's own wellbeing data would be the wrong trade.
  const askBirthday = !p.birthMonth && !p.birthdayPromptDismissed;
  const needsBackup = stateManager.needsBackupNudge();
  const daysSinceExport = stateManager.daysSinceLastExport();

  container.innerHTML = `
    ${mentalHealthNotice(getMentalHealthNotice(state))}
    ${reviewDue ? `
      <div class="checkin-banner">
        <p><strong>${t("Weekly review open.")}</strong> ${t("Two minutes of rough weekly numbers keep every score measured — no daily logging.")}</p>
        <a href="#/review" class="btn btn-primary" style="white-space: nowrap;">${t("Start Weekly Review")}</a>
      </div>` : ""}
    ${askBirthday ? `
      <div class="checkin-banner">
        <p><strong>${t("When does your year turn?")}</strong> ${t("Your level is your age. Tell the app the day and it can close each year and open the next — month and day only, never the year you were born.")}</p>
        <span style="display: flex; gap: 8px; white-space: nowrap;">
          <a href="#/year" class="btn btn-primary">${t("Answer")}</a>
          <button type="button" id="birthday-prompt-dismiss" class="btn">${t("Not now")}</button>
        </span>
      </div>` : ""}
    ${checkinDue ? `
      <div class="checkin-banner">
        <p><strong>${t("Monthly re-assessment due.")}</strong> ${t("Re-run the short well-being instruments so your scores track your real standing, not last month's.")}</p>
        <a href="#/checkin" class="btn btn-primary" style="white-space: nowrap;">${t("Start Re-assessment")}</a>
      </div>` : ""}
    ${needsBackup ? `
      <div class="checkin-banner">
        <p><strong>${t("Back up your data.")}</strong> ${daysSinceExport === null
          ? t("Everything here is stored only in this browser. Clearing site data, or the browser reclaiming space, would erase it with no way back.")
          : tp("Your last backup was {days} days ago. Everything here is stored only in this browser, so a cleared cache would erase it.", { days: daysSinceExport })}</p>
        <button type="button" id="backup-nudge-export" class="btn btn-primary" style="white-space: nowrap;">${t("Export")}</button>
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
            <div style="position: absolute; bottom: -5px; right: -5px;" class="level-badge">${t("Lv.")}${escapeHtml(p.level)}</div>
          </div>
          <div style="flex-grow: 1;">
            <h3 style="font-family: var(--font-serif); font-size: 1.4rem; font-weight: bold; color: var(--color-navy);">${escapeHtml(p.name)}</h3>
            <p style="font-family: var(--font-sans); font-size: 0.82rem; color: var(--color-gold); font-weight: 600;">
              ${escapeHtml(t(p.employment))} (${escapeHtml(t(p.region))})
            </p>
            <div class="xp-bar-container" role="progressbar" aria-label="${t("This year's points")}" aria-valuenow="${pace.percent}" aria-valuemin="0" aria-valuemax="100">
              <div class="xp-bar-fill" style="width: ${pace.percent}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-family: var(--font-serif); font-size: 0.75rem; margin-top: 4px; color: var(--color-text-secondary);">
              ${pace.ratio === null
                ? `<span>${tp("{xp} points this year", { xp: escapeHtml(pace.earned) })}</span><span>${t("Year just started")}</span>`
                : `<span>${tp("Points: {xp} / {possible}", { xp: escapeHtml(pace.earned), possible: pace.possible })}</span>
                   <span>${tp("Progress: {pct}%", { pct: pace.percent })}</span>`}
            </div>
            <a href="#/year" style="display: inline-block; margin-top: 6px; font-size: 0.75rem; font-weight: 600;">${t("Your year")} &rsaquo;</a>
          </div>
        </div>

        <div class="card">
          ${balanceIndexBlock(index, indexBand, weakest)}
        </div>

        <div class="card">
          <h4 class="card-header">${t("Aspect Radar")}</h4>
          <div id="radar-chart-container"></div>
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
                    <span class="aspect-row-figures">${gradeBadge(grades[key])} <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${val}%</span></span>
                  </div>
                  <div class="xp-bar-container" style="height: 5px; margin-top: 0;" role="progressbar" aria-label="${aspectLabel(key)}" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100">
                    <div class="xp-bar-fill" style="width: ${val}%; background-color: var(--color-gold);"></div>
                  </div>
                  ${b ? `
                  <div class="benchmark-line" title="${escapeHtml(b.summary)}">
                    ${benchmarkStanding(b, { compact: true })} <span class="benchmark-method">(${methodTag(b.method)})</span>
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
          <h4 class="card-header">${t("Recent Reviews")}</h4>
          <div class="terminal" id="dashboard-terminal">
            ${state.reviews.length === 0 ?
              `<div class="terminal-line"><span class="terminal-accent">> ${t("No weekly reviews yet — your first one opens the week after onboarding.")}</span></div>` :
              state.reviews.slice(-4).reverse().map(r => {
                const met = r.goals.filter(g => g.met).length;
                const shiftText = Object.entries(r.shifts || {})
                  .map(([key, v]) => `${aspectLabel(key)} ${v > 0 ? "+" : ""}${v}`)
                  .join(" · ");
                return `
                <div class="terminal-line">
                  <span class="terminal-gold">[${new Date(r.date).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })}]</span>
                  ${shiftText || t("scores steady")} · ${tp("{met}/{total} pledges met", { met, total: r.goals.length })} · ${tp("+{xp} points", { xp: r.xp })}
                </div>`;
              }).join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;

  renderRadarChart("radar-chart-container", state.aspects, { average: AVERAGE_ASPECT_SCORES });

  // Removing the node rather than re-rendering: the flag is persisted either
  // way, and a full re-render would scroll the user back to the top of the
  // dashboard as a reward for declining a question.
  document.getElementById("birthday-prompt-dismiss")?.addEventListener("click", (e) => {
    stateManager.dismissBirthdayPrompt();
    e.target.closest(".checkin-banner")?.remove();
  });

  if (needsBackup && typeof onExportBackup === "function") {
    document.getElementById("backup-nudge-export")
      ?.addEventListener("click", onExportBackup);
  }
}
