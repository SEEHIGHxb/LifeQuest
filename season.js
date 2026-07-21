// season.js - The level-year ("season") as pure arithmetic.
//
// A season runs birthday to birthday. XP is unlimited within it and resets at
// level-up, with the closed season archived to state.levelYears — the archive
// is what makes the reset read as "filed" rather than "wiped".
//
// Also the home of the shared week helpers (isoWeekKey and friends): the
// weekly review and season accrual both slice time into ISO weeks, and having
// two implementations of "which week is it" would let them disagree about
// whether a week had happened.
//
// Pure: no DOM, no storage, no i18n.

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

// --- WEEKS (shared by the weekly review and season accrual) ---

// Thursday-based ISO week number, keyed as "YYYY-Www".
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  // Deliberately UNPADDED ("2026-W3", not "2026-W03"): this exact string is
  // already stored in every existing save as reviews[].week, and isWeeklyReviewDue
  // compares against it. Padding would make weeks 1-9 mismatch their stored key
  // and show a spurious "review due" to everyone in early January.
  return `${d.getUTCFullYear()}-W${week}`;
}

// Local midnight on the Monday of `date`'s week. Local, not UTC: a week
// boundary is a fact about the user's calendar, not about the prime meridian.
export function weekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// "YYYY-MM-DD" for a local date — the storage form of an accrual anchor.
export function dateKey(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Whole weeks between two dates, by their Monday boundaries. Rounded rather
// than floored because a DST week is 167 or 169 hours, and flooring would drop
// a week twice a year.
export function weeksBetween(from, to) {
  const ms = weekStart(to).getTime() - weekStart(from).getTime();
  return Math.max(0, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}

// Weeks are charged to `possibleXp` whether or not a review was submitted —
// otherwise skipping a week would quietly shrink the denominator and hand the
// user a better ratio for having done less.
//
// The CURRENT week is never charged: you cannot be behind on a week that is
// still running. Accrual anchors to the last charged week, or to the season's
// own start when nothing has been charged yet, so a season never inherits
// weeks from before it existed.
//
// `weeklyValue` is derived from the pledges configured RIGHT NOW, including
// for weeks missed under a different configuration. That is an approximation,
// and a deliberate one: the alternative is storing a pledge-config history to
// answer a question no user will ask.
export const MAX_ACCRUAL_WEEKS = 260; // ~5 years; a backstop against a corrupt anchor

export function accrueSeason(season, weeklyValue, now, maxWeeks = MAX_ACCRUAL_WEEKS) {
  const current = dateKey(weekStart(now));
  const anchor = (season && season.lastAccrualWeek) || (season && season.startDate);
  const from = anchor ? new Date(anchor) : null;
  if (!from || !Number.isFinite(from.getTime())) {
    // No usable anchor: start charging from this week rather than inventing a
    // backlog out of a date we could not read.
    return { weeks: 0, possibleXp: Math.max(0, finite(season && season.possibleXp)), lastAccrualWeek: current };
  }
  const weeks = Math.min(maxWeeks, weeksBetween(from, now));
  return {
    weeks,
    possibleXp: Math.max(0, finite(season && season.possibleXp)) + weeks * Math.max(0, finite(weeklyValue)),
    lastAccrualWeek: current
  };
}

// --- BIRTHDAYS ---

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Where a birthday falls in a given year, as local midnight.
//
// Feb 29 is observed on Mar 1 in common years. The alternative — Feb 28 —
// would fire the level-up a day before the birthday exists, and skipping the
// year entirely would leave leap-day users three years out of four younger
// than they are.
export function birthdayInYear(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) return new Date(year, 2, 1);
  return new Date(year, month - 1, day);
}

// The most recent birthday on or before `now` — the anchor used the first time
// a birthday becomes known. The user's level already equals their age, so that
// birthday has already been counted; anchoring here is what stops the app
// celebrating a year they have not lived.
export function mostRecentBirthday(now, month, day) {
  const thisYear = birthdayInYear(now.getFullYear(), month, day);
  return thisYear <= now ? thisYear : birthdayInYear(now.getFullYear() - 1, month, day);
}

// Every birthday strictly after `lastDate` and no later than `now`, oldest
// first. Returns more than one when a backup is imported after a multi-year
// gap — losing those years would be worse than replaying them.
export function birthdaysSince(lastDate, now, month, day, maxYears = 120) {
  const out = [];
  const startYear = lastDate.getFullYear();
  const endYear = now.getFullYear();
  if (endYear - startYear > maxYears) return out; // corrupt anchor, not a lifetime
  for (let y = startYear; y <= endYear; y++) {
    const b = birthdayInYear(y, month, day);
    if (b > lastDate && b <= now) out.push(b);
  }
  return out;
}
