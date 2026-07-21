// Tests for age-as-level, seasonal XP, and the v4 -> v5 migration (node --test).
//
// The migration is the irreversible part of this phase: it rewrites what
// `level` MEANS on a save that already exists. These tests exist mostly to pin
// the parts where getting it wrong silently corrupts real user data rather
// than throwing.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";
import { seasonPace, closeSeason, openSeason, PACE_THRESHOLD } from "../season.js";
import {
  migrateV4State, sanitizeBirthday, sanitizeSeason,
  sanitizeLastLevelUp, sanitizeLevelYears, LEVEL_YEAR_LIMIT
} from "../sanitize.js";

function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => installMockStorage());

// Load a raw save the way the app does — through loadState's migration chain.
function load(raw) {
  localStorage.setItem("lifequest_state", JSON.stringify(raw));
  return new GameStateManager().state;
}

const V4_SAVE = {
  schemaVersion: 4,
  onboarded: true,
  profile: { name: "Migrator", level: 7, xp: 40, lifetimeXp: 2140, age: 34 },
  aspects: { finance: 60, physical: 55, mental: 70, relationships: 65, personalGoals: 50, socialContribution: 30, environment: 45, humanityFuture: 40 },
  baseline: { who5: 17, st5: 3, ucla: 4, lsns: 17, gse: 18, cfpb: 10 }
};

// --- MIGRATION v4 -> v5 ---

test("a v4 save migrates in place: level becomes the age, lifetime points survive", () => {
  const s = load(V4_SAVE);
  assert.equal(s.schemaVersion, 5);
  assert.equal(s.profile.level, 34, "level is the user's age, not an earned number");
  assert.equal(s.profile.lifetimeXp, 2140, "the shareable lifetime total is untouched");
  assert.equal(s.profile.season.earnedXp, 40, "the old per-level xp opens the first season");
  assert.equal(s.profile.xp, undefined, "the v4 xp field is gone");
  assert.deepEqual(s.levelYears, [], "no seasons archived yet");
  assert.equal(s.aspects.finance, 60, "scores carry over untouched");
  assert.equal(s.baseline.who5, 17, "the instrument baseline carries over");
});

// The bug this guards is the one that reads plausibly and destroys data:
// after migration `level` means AGE, so running the pre-counter backfill
// (100*(level-1)*level/2) afterwards would mint ~56,000 lifetime points for a
// 34-year-old who had earned 1,030 — inflating the number the comparison code
// shares, permanently, with no error anywhere.
test("the lifetime-XP backfill reads the earned level, never the age", () => {
  const s = load({ ...V4_SAVE, profile: { name: "Old", level: 5, xp: 30, age: 34 } });
  assert.equal(s.profile.lifetimeXp, 1030, "100*(4*5)/2 + 30 — from the EARNED level 5");
  assert.notEqual(s.profile.lifetimeXp, 56100, "not 100*(33*34)/2 — that would be reading the age");
  assert.equal(s.profile.level, 34, "and the level still becomes the age");
});

test("a v4 save with an unusable age keeps the level it had", () => {
  const migrated = migrateV4State({ profile: { level: 12, xp: 0, lifetimeXp: 500, age: "nonsense" } });
  assert.equal(migrated.profile.level, 12, "better a stale level than a reset to 1");
  const absurd = migrateV4State({ profile: { level: 12, xp: 0, lifetimeXp: 500, age: 999 } });
  assert.equal(absurd.profile.level, 12, "an out-of-range age is not a level either");
});

test("a v4 backup imports through the same chain as a v4 save", () => {
  const m = new GameStateManager();
  m.importState(JSON.stringify(V4_SAVE));
  assert.equal(m.state.schemaVersion, 5);
  assert.equal(m.state.profile.level, 34);
  assert.equal(m.state.profile.lifetimeXp, 2140);
});

test("migration opens the season now, not at the original baseline", () => {
  // Anchoring the season to a two-year-old start date would accrue two years
  // of possibleXp against one season's earnings and open the new model on a
  // ratio near zero — punishing the user for time before the feature existed.
  const before = Date.now();
  const s = load(V4_SAVE);
  const started = new Date(s.profile.season.startDate).getTime();
  assert.ok(started >= before - 1000 && started <= Date.now() + 1000, "season starts at migration time");
  assert.equal(s.profile.season.possibleXp, 0, "nothing accrued yet");
  assert.equal(s.profile.season.lastAccrualWeek, null, "first init() anchors accrual");
});

// --- BIRTHDAY VALIDATION ---

test("a birthday must name a real calendar day", () => {
  assert.deepEqual(sanitizeBirthday(3, 14), { birthMonth: 3, birthDay: 14 });
  assert.deepEqual(sanitizeBirthday(2, 29), { birthMonth: 2, birthDay: 29 },
    "Feb 29 is a real birthday — rejecting it locks leap-day users out of levelling up");
  assert.deepEqual(sanitizeBirthday(2, 30), { birthMonth: null, birthDay: null });
  assert.deepEqual(sanitizeBirthday(4, 31), { birthMonth: null, birthDay: null }, "April has 30 days");
  assert.deepEqual(sanitizeBirthday(13, 1), { birthMonth: null, birthDay: null });
  assert.deepEqual(sanitizeBirthday(3, null), { birthMonth: null, birthDay: null },
    "a half-set birthday is unanswerable, so it is not stored at all");
  assert.deepEqual(sanitizeBirthday("<img>", "x"), { birthMonth: null, birthDay: null });
});

// --- HOSTILE IMPORT COERCION ---

test("hostile season/level-year data is coerced, not trusted", () => {
  const season = sanitizeSeason({
    startDate: "<script>", earnedXp: "1e999", possibleXp: -5, lastAccrualWeek: "x".repeat(99)
  });
  assert.equal(season.startDate, null, "an unparseable start date is dropped");
  // "1e999" parses to Infinity, which is not finite, so clampNumber returns
  // its fallback rather than the cap. Losing the value is the right trade:
  // an Infinity reaching the pace ratio would render NaN across the card.
  assert.equal(season.earnedXp, 0, "Infinity collapses to the fallback, never leaks");
  assert.equal(season.possibleXp, 0, "negatives floor at 0");
  assert.equal(season.lastAccrualWeek.length, 12, "week key length-capped");

  assert.equal(sanitizeLastLevelUp({ date: "not-a-date" }), null,
    "a garbage stamp would either freeze the level or fire a hundred level-ups");
  assert.equal(sanitizeLastLevelUp(null), null);
  assert.deepEqual(sanitizeLastLevelUp({ date: "2026-03-14T00:00:00.000Z", lifetimeXpAt: -1 }),
    { date: "2026-03-14T00:00:00.000Z", lifetimeXpAt: 0 });

  const years = sanitizeLevelYears([{ level: 34, xp: 6200, possible: 7280, ratio: 0.85 }, null, "x", { ratio: 99 }]);
  assert.equal(years.length, 2, "non-objects dropped");
  assert.equal(years[0].level, 34);
  assert.equal(years[1].ratio, 1, "ratio drives a bar width, so it is clamped to [0,1]");
  assert.equal(sanitizeLevelYears("nope").length, 0);
  assert.equal(
    sanitizeLevelYears(Array.from({ length: 500 }, () => ({ level: 1 }))).length,
    LEVEL_YEAR_LIMIT, "archive is capped"
  );
});

// --- SEASON PACE ---

test("a season that has not accrued yet reports no pace, not zero pace", () => {
  const fresh = seasonPace({ earnedXp: 0, possibleXp: 0 });
  assert.equal(fresh.ratio, null, "null means 'no data', which the UI shows neutrally");
  assert.equal(fresh.onPace, null, "0/0 is not 'behind' — the year just started");
  assert.equal(fresh.percent, 0);
  assert.equal(seasonPace(null).ratio, null, "a missing season does not throw");
  assert.equal(seasonPace({ earnedXp: NaN, possibleXp: NaN }).earned, 0);
});

test("pace ratio compares earned against what the year made possible", () => {
  const p = seasonPace({ earnedXp: 6200, possibleXp: 7280 });
  assert.equal(p.percent, 85);
  assert.ok(Math.abs(p.ratio - 0.8516) < 0.001);
  assert.equal(p.onPace, true);

  const behind = seasonPace({ earnedXp: 1000, possibleXp: 7280 });
  assert.equal(behind.onPace, false, "0.137 is under the threshold");

  // The threshold is a named tunable, not a researched figure — pin it so a
  // change is a deliberate edit rather than a drift.
  assert.equal(PACE_THRESHOLD, 0.55);
  assert.equal(seasonPace({ earnedXp: 55, possibleXp: 100 }).onPace, true, "exactly at threshold counts");
  assert.equal(seasonPace({ earnedXp: 54, possibleXp: 100 }).onPace, false);
});

test("beating the envelope reports the real ratio but a capped bar", () => {
  const over = seasonPace({ earnedXp: 9000, possibleXp: 7280 });
  assert.equal(over.percent, 100, "bar geometry caps");
  assert.ok(over.ratio > 1, "the figure itself does not");
});

test("closing a season archives it; opening one starts empty", () => {
  const archived = closeSeason(34, { earnedXp: 6200, possibleXp: 7280 });
  assert.deepEqual(archived, { level: 34, xp: 6200, possible: 7280, ratio: archived.ratio });
  assert.ok(Math.abs(archived.ratio - 0.8516) < 0.001);
  assert.equal(closeSeason(34, { earnedXp: 0, possibleXp: 0 }).ratio, 0, "a never-accrued season files as 0");

  const opened = openSeason(new Date("2026-03-14T00:00:00.000Z"));
  assert.deepEqual(opened, {
    startDate: "2026-03-14T00:00:00.000Z", earnedXp: 0, possibleXp: 0, lastAccrualWeek: null
  });
});
