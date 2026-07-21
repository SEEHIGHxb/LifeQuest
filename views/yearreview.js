// views/yearreview.js - the level-year screen (#/year).
//
// Two jobs, one route. When the birthday is unknown it asks the single question
// that makes level-ups possible; once known it reports where the current year
// stands. Both live here so dismissing the dashboard prompt is never a dead end
// — the status card always links back to this page.
//
// The tone is fixed by the plan: FORWARD-LOOKING, never punitive. This screen
// reports what has been earned and how much runway is left, and it does not
// render a verdict on either. There is deliberately no use of seasonPace's
// `onPace` flag here; a number the user can interpret beats a grade the app
// hands down.

import { stateManager } from "../state.js";
import { seasonPace, nextBirthday, daysUntil, weeksBetween } from "../season.js";
import { t, tp, dateLocale } from "../i18n.js";
import { escapeHtml, aspectLabel, birthdayFields } from "./helpers.js";

// The recorded snapshot closest to the season's start, on either side.
//
// The card labels its deltas with THIS snapshot's own date rather than with the
// birthday, so the figure is exactly true regardless of where the nearest
// weekly snapshot happened to land. Claiming "since your birthday" while
// measuring from eleven days later would be a small, avoidable lie.
function anchorSnapshot(snapshots, startIso) {
  const start = new Date(startIso).getTime();
  if (!Array.isArray(snapshots) || snapshots.length < 2 || !Number.isFinite(start)) return null;
  let best = null;
  let bestGap = Infinity;
  for (const snap of snapshots) {
    const at = new Date(snap && snap.date).getTime();
    if (!Number.isFinite(at) || !snap.aspects) continue;
    const gap = Math.abs(at - start);
    if (gap < bestGap) { best = snap; bestGap = gap; }
  }
  // The newest snapshot as anchor means there is nothing to compare it against.
  return best === snapshots[snapshots.length - 1] ? null : best;
}

function shortDate(value) {
  return new Date(value).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

function birthdayForm(profile, submitLabel) {
  return `
    <form id="year-birthday-form">
      ${birthdayFields({ idPrefix: "year-birthday", month: profile.birthMonth, day: profile.birthDay })}
      <button type="submit" class="btn btn-primary">${submitLabel}</button>
      <p id="year-birthday-error" class="d-none" style="color: var(--color-crimson); margin-top: 10px; font-weight: 600;"></p>
    </form>`;
}

function askCard(profile) {
  return `
    <div class="card">
      <h3 class="card-header">${t("Your year")}</h3>
      <p style="font-size: 0.9rem; margin-bottom: 8px;">
        ${t("Your level is simply your age — a fact about you, not a score you earned. Tell the app which day your year turns and it can close each year and open the next one for you.")}
      </p>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 14px;">
        ${t("Month and day only. Your birth year is never asked for and never stored.")}
      </p>
      ${birthdayForm(profile, t("Save"))}
    </div>`;
}

function statusCard(profile, now) {
  const pace = seasonPace(profile.season);
  const closes = nextBirthday(now, profile.birthMonth, profile.birthDay);
  const days = daysUntil(now, closes);
  const weeks = weeksBetween(now, closes);
  return `
    <div class="card">
      <h3 class="card-header">${tp("Year {level}", { level: escapeHtml(profile.level) })}</h3>
      <p style="font-size: 0.95rem; margin-bottom: 10px;">
        ${days === 0
          ? t("This year closes today.")
          : tp("Closes on {date} — {days} days from now.", { date: escapeHtml(shortDate(closes)), days })}
      </p>
      <div class="xp-bar-container" role="progressbar" aria-label="${t("This year's points")}"
        aria-valuenow="${pace.percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="xp-bar-fill" style="width: ${pace.percent}%;"></div>
      </div>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 8px;">
        ${pace.ratio === null
          ? t("This year has only just opened — there is nothing to measure yet.")
          : tp("{xp} points earned of the {possible} your pledges have offered so far.", {
              xp: escapeHtml(pace.earned), possible: escapeHtml(pace.possible)
            })}
      </p>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
        ${tp("{weeks} weeks still to run.", { weeks })}
      </p>
      <details style="margin-top: 12px;">
        <summary style="cursor: pointer; font-size: 0.85rem; font-weight: 600;">${t("Change the day your year turns")}</summary>
        <div style="margin-top: 10px;">
          ${birthdayForm(profile, t("Save"))}
        </div>
      </details>
    </div>`;
}

function movementCard(state) {
  const anchor = anchorSnapshot(state.snapshots, state.profile.season && state.profile.season.startDate);
  if (!anchor) return "";
  const rows = Object.entries(state.aspects)
    .map(([key, value]) => ({ key, delta: Math.round(value - (Number(anchor.aspects[key]) || 0)) }))
    .filter(row => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return `
    <div class="card">
      <h4 class="card-header">${t("Movement this year")}</h4>
      <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 10px;">
        ${tp("Measured against your closest recorded snapshot, {date}.", { date: escapeHtml(shortDate(anchor.date)) })}
      </p>
      ${rows.length === 0
        ? `<p style="font-size: 0.85rem;">${t("Your scores have held steady so far.")}</p>`
        : `<div class="terminal">${rows.map(row => `
            <div class="terminal-line">
              <span class="terminal-gold">${aspectLabel(row.key)}</span>
              ${row.delta > 0 ? "+" : ""}${row.delta}
            </div>`).join("")}</div>`}
    </div>`;
}

// The archive is the whole reason a season reset is survivable: a year does not
// vanish at the birthday, it moves here. Newest first.
function archiveCard(levelYears) {
  const years = (levelYears || []).slice(-12).reverse();
  return `
    <div class="card">
      <h4 class="card-header">${t("Years filed")}</h4>
      ${years.length === 0
        ? `<p style="font-size: 0.85rem; color: var(--color-text-secondary);">${t("Nothing filed yet — your first year closes on your next birthday.")}</p>`
        : years.map(year => {
          const percent = Math.round(Math.max(0, Math.min(1, Number(year.ratio) || 0)) * 100);
          return `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 500;">
              <span>${tp("Year {level}", { level: escapeHtml(year.level) })}</span>
              <span class="text-gold" style="font-family: var(--font-mono);">
                ${tp("{xp} / {possible} points", { xp: escapeHtml(year.xp), possible: escapeHtml(year.possible) })}
              </span>
            </div>
            <div class="xp-bar-container" style="height: 5px; margin-top: 4px;" role="progressbar"
              aria-label="${tp("Year {level}", { level: escapeHtml(year.level) })}"
              aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
              <div class="xp-bar-fill" style="width: ${percent}%; background-color: var(--color-gold);"></div>
            </div>
          </div>`;
        }).join("")}
    </div>`;
}

export function renderYearReview(containerId, state, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const profile = state.profile;
  const known = Boolean(profile.birthMonth && profile.birthDay);
  const now = new Date();

  container.innerHTML = `
    ${known ? statusCard(profile, now) : askCard(profile)}
    ${known ? movementCard(state) : ""}
    ${archiveCard(state.levelYears)}
  `;

  const form = document.getElementById("year-birthday-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const errorEl = document.getElementById("year-birthday-error");
    errorEl.classList.add("d-none");
    const month = document.getElementById("year-birthday-month").value;
    const day = document.getElementById("year-birthday-day").value;

    // An empty month is "prefer not to say", not an error: the question is
    // optional and refusing it has to stay free of a scolding red message.
    if (!month) {
      stateManager.dismissBirthdayPrompt();
      if (typeof onChange === "function") onChange();
      return;
    }
    // setBirthday rejects rather than clamps, so 31 February lands here instead
    // of quietly becoming 1 March and levelling the user up on the wrong day.
    if (!stateManager.setBirthday(month, day)) {
      errorEl.textContent = t("That date doesn't exist — check the day of the month.");
      errorEl.classList.remove("d-none");
      return;
    }
    if (typeof onChange === "function") onChange();
  });
}
