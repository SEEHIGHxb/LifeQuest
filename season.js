// season.js - The level-year ("season") as pure arithmetic.
//
// A season runs birthday to birthday. XP is unlimited within it and resets at
// level-up, with the closed season archived to state.levelYears — the archive
// is what makes the reset read as "filed" rather than "wiped".
//
// Pure: no DOM, no storage, no i18n. Birthday processing (L2b) builds on this.

// The share of a season's possible XP that counts as keeping pace.
//
// This is a NAMED TUNABLE, not a researched figure. It falls out of the XP
// envelope arithmetic (default pledge trio = 140/wk -> ~7,280/yr) and nothing
// external validates it. Revisit after one real year of data rather than
// treating it as a finding.
export const PACE_THRESHOLD = 0.55;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

// Where a season stands against what it could have been.
//
// `ratio` is null — not 0 — when nothing has accrued yet. A season that opened
// seconds ago has earned 0 of 0 possible, and rendering that as "0%, behind
// pace" would have the app scolding someone for time they have not had yet.
// Callers show a neutral "season just started" state for null.
export function seasonPace(season) {
  const earned = Math.max(0, finite(season && season.earnedXp));
  const possible = Math.max(0, finite(season && season.possibleXp));
  if (possible <= 0) {
    return { earned, possible: 0, ratio: null, percent: 0, onPace: null };
  }
  const ratio = earned / possible;
  return {
    earned,
    possible,
    ratio,
    // Capped for the bar's geometry only; `ratio` stays uncapped so a season
    // that beat its envelope still reports the real figure.
    percent: Math.round(Math.min(1, ratio) * 100),
    onPace: ratio >= PACE_THRESHOLD
  };
}

// Close a season into an archive entry. Ratio is clamped to [0,1] because it
// renders as a bar width; `xp` and `possible` keep the raw totals.
export function closeSeason(level, season) {
  const pace = seasonPace(season);
  return {
    level: Math.round(finite(level, 1)),
    xp: Math.round(pace.earned),
    possible: Math.round(pace.possible),
    ratio: pace.ratio === null ? 0 : Math.max(0, Math.min(1, pace.ratio))
  };
}

// A fresh season opening on `date`.
export function openSeason(date) {
  return {
    startDate: date.toISOString(),
    earnedXp: 0,
    possibleXp: 0,
    lastAccrualWeek: null
  };
}
