// Tests for age-as-level, seasonal XP, and the v4 -> v5 migration (node --test).
//
// The migration is the irreversible part of this phase: it rewrites what
// `level` MEANS on a save that already exists. These tests exist mostly to pin
// the parts where getting it wrong silently corrupts real user data rather
// than throwing.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";
import {
  seasonPace, closeSeason, openSeason, PACE_THRESHOLD,
  isLeapYear, birthdayInYear, weeksBetween
} from "../season.js";
import { ageBandShifts, calculateFinanceScore } from "../scoring.js";
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
  assert.equal(season.lastAccrualWeek, null,
    "an unparseable accrual anchor is dropped — it would make possibleXp NaN");

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

// --- BIRTHDAY PROCESSING ---

// Birthdays are stored as an ISO instant of LOCAL midnight, so slicing the
// string would read back the UTC date (a day early anywhere east of Greenwich).
// Assert the day the user actually experiences.
function localYMD(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// A loaded, onboarded v5 manager with a known birthday.
function birthdayManager(overrides = {}) {
  localStorage.setItem("lifequest_state", JSON.stringify({
    ...V4_SAVE,
    profile: { ...V4_SAVE.profile, ...(overrides.profile || {}) },
    goals: overrides.goals || []
  }));
  const m = new GameStateManager();
  Object.assign(m.state.profile, { birthMonth: 3, birthDay: 14 }, overrides.after || {});
  return m;
}

test("learning the birthday anchors it without inventing a level-up", () => {
  const m = birthdayManager();
  const level = m.state.profile.level;
  // Level already equals the age, so the most recent birthday is already
  // counted. Firing here would hand the user a year they have not lived.
  m.processBirthdays(new Date(2026, 6, 21));
  assert.equal(m.state.profile.level, level, "no level-up on first learning the date");
  assert.equal(localYMD(m.state.profile.lastLevelUp.date), "2026-03-14",
    "anchored to the most recent PAST birthday");
  assert.deepEqual(m.state.levelYears, [], "nothing archived");
});

test("no birthday set means no processing and no crash", () => {
  const m = birthdayManager();
  m.state.profile.birthMonth = null;
  m.state.profile.birthDay = null;
  assert.equal(m.processBirthdays(new Date(2026, 6, 21)), false);
  assert.equal(m.state.profile.lastLevelUp, null, "an unanswered question freezes nothing");
});

test("a birthday advances the level and files the season", () => {
  const m = birthdayManager();
  m.state.profile.lastLevelUp = { date: new Date(2026, 2, 14).toISOString(), lifetimeXpAt: 2140 };
  m.state.profile.season = { startDate: new Date(2026, 2, 14).toISOString(), earnedXp: 6200, possibleXp: 7280, lastAccrualWeek: null };

  m.processBirthdays(new Date(2027, 2, 20)); // past the 2027 birthday

  assert.equal(m.state.profile.level, 35, "34 -> 35");
  assert.equal(m.state.profile.age, 35, "age tracks the level, or the CFPB band goes stale");
  assert.equal(m.state.levelYears.length, 1);
  assert.deepEqual(m.state.levelYears[0], { level: 34, xp: 6200, possible: 7280, ratio: m.state.levelYears[0].ratio });
  assert.ok(Math.abs(m.state.levelYears[0].ratio - 0.8516) < 0.001, "the closed season keeps its real ratio");
  assert.equal(m.state.profile.season.earnedXp, 0, "the new season starts empty");
  assert.equal(m.state.profile.lifetimeXp, 2140, "lifetime points never reset");
});

test("processing is idempotent — a second boot the same day does not re-level", () => {
  const m = birthdayManager();
  m.state.profile.lastLevelUp = { date: new Date(2026, 2, 14).toISOString(), lifetimeXpAt: 0 };
  const now = new Date(2027, 2, 20);
  m.processBirthdays(now);
  const after = m.state.profile.level;
  assert.equal(m.processBirthdays(now), false, "nothing left to do");
  assert.equal(m.state.profile.level, after, "level unchanged on the second pass");
  assert.equal(m.state.levelYears.length, 1, "and no duplicate archive entry");
});

test("a backup imported after a multi-year gap levels up once per birthday", () => {
  const m = birthdayManager();
  m.state.profile.lastLevelUp = { date: new Date(2024, 2, 14).toISOString(), lifetimeXpAt: 0 };
  m.state.profile.season = { startDate: new Date(2024, 2, 14).toISOString(), earnedXp: 900, possibleXp: 1000, lastAccrualWeek: null };

  m.processBirthdays(new Date(2027, 5, 1)); // 2025, 2026, 2027 birthdays all passed

  assert.equal(m.state.profile.level, 37, "34 + 3 — losing those years would be worse than replaying them");
  assert.equal(m.state.levelYears.length, 3);
  assert.equal(m.state.levelYears[0].xp, 900, "the running season files into the first year crossed");
  assert.equal(m.state.levelYears[1].xp, 0, "the app was not running for the rest; they file empty");
  assert.equal(m.state.levelYears[2].xp, 0);
  assert.equal(localYMD(m.state.profile.season.startDate), "2027-03-14", "season opens on the latest birthday");
});

test("a Feb 29 birthday is observed on Mar 1 in common years", () => {
  assert.equal(birthdayInYear(2028, 2, 29).getMonth(), 1, "2028 is a leap year — real Feb 29");
  assert.equal(birthdayInYear(2028, 2, 29).getDate(), 29);
  // Observing on Feb 28 would fire before the birthday exists; skipping the
  // year would leave leap-day users younger than they are 3 years in 4.
  assert.equal(birthdayInYear(2027, 2, 29).getMonth(), 2, "2027 is common — observed in March");
  assert.equal(birthdayInYear(2027, 2, 29).getDate(), 1);
  assert.equal(isLeapYear(2000), true, "divisible by 400");
  assert.equal(isLeapYear(1900), false, "divisible by 100 but not 400");

  const m = birthdayManager();
  m.state.profile.birthMonth = 2;
  m.state.profile.birthDay = 29;
  m.state.profile.lastLevelUp = { date: new Date(2026, 2, 1).toISOString(), lifetimeXpAt: 0 };
  m.processBirthdays(new Date(2027, 2, 2)); // Mar 2 2027, just past the observed date
  assert.equal(m.state.profile.level, 35, "a leap-day user still ages in a common year");
});

test("init() processes birthdays BEFORE accrual, so a closed season is not back-charged", () => {
  const m = birthdayManager();
  const lastBirthday = new Date(2026, 2, 14);
  m.state.profile.lastLevelUp = { date: lastBirthday.toISOString(), lifetimeXpAt: 0 };
  m.state.profile.season = { startDate: lastBirthday.toISOString(), earnedXp: 500, possibleXp: 0, lastAccrualWeek: null };

  m.init(new Date(2027, 3, 11)); // four weeks past the 2027 birthday

  // Were accrual to run first, it would charge a year of possible XP to the
  // season about to close and file it on a ratio it never had a chance to earn.
  assert.equal(m.state.levelYears.length, 1);
  assert.equal(m.state.levelYears[0].possible, 0, "the closed season files with the possible it actually had");
  assert.equal(m.state.levelYears[0].xp, 500, "and the XP it actually earned");
  assert.equal(m.state.levelYears[0].ratio, 0);

  const fresh = m.state.profile.season;
  assert.equal(fresh.earnedXp, 0, "the new season starts empty");
  assert.equal(fresh.possibleXp, weeksBetween(new Date(2027, 2, 14), new Date(2027, 3, 11)) * 60,
    "and accrues only from the birthday forward");
  assert.ok(fresh.possibleXp > 0, "the accrual really ran — this assertion is not vacuous");
});

test("init() does nothing before onboarding", () => {
  const m = birthdayManager();
  m.state.onboarded = false;
  m.state.profile.lastLevelUp = null;
  m.init(new Date(2027, 2, 20));
  assert.equal(m.state.profile.lastLevelUp, null, "no birthday anchoring on a state with no user yet");
  assert.deepEqual(m.state.levelYears, []);
});

// --- CFPB AGE BAND (the delta that must not become a recompute) ---

test("crossing the CFPB 62 band shifts finance without wiping adjustments", () => {
  const m = birthdayManager({ profile: { age: 61, level: 61 } });
  m.state.profile.lastLevelUp = { date: new Date(2026, 2, 14).toISOString(), lifetimeXpAt: 0 };
  // A stored score no fresh recompute would ever produce: it carries months of
  // check-in and deep-assessment adjustment on top of the base formula.
  m.state.aspects.finance = 88;
  const cfpb = [Number(m.state.baseline.cfpb) || 0];
  const expected = ageBandShifts(m.state.profile, 61, 62, m.state.baseline);

  m.processBirthdays(new Date(2027, 2, 20));

  assert.equal(m.state.profile.age, 62, "now in the older CFPB band");
  assert.notDeepEqual(expected, {}, "the 62 band really does move the score — this test is not vacuous");
  assert.equal(m.state.aspects.finance, 88 + expected.finance, "stored value plus the delta");
  assert.notEqual(
    m.state.aspects.finance,
    calculateFinanceScore(m.state.profile, cfpb),
    "NOT a fresh recompute — that would silently discard every check-in adjustment"
  );
});

test("a birthday that changes no age band leaves every score alone", () => {
  const m = birthdayManager();
  m.state.profile.lastLevelUp = { date: new Date(2026, 2, 14).toISOString(), lifetimeXpAt: 0 };
  const before = { ...m.state.aspects };
  m.processBirthdays(new Date(2027, 2, 20)); // 34 -> 35, well inside the 18-61 band
  assert.deepEqual(m.state.aspects, before, "ageing is not a score event by itself");
});

// --- possibleXp ACCRUAL ---

test("possible XP accrues for missed weeks, so skipping does not flatter the ratio", () => {
  const m = birthdayManager({ goals: [] });
  const start = new Date(2026, 5, 1); // Mon 1 Jun 2026
  m.state.profile.season = { startDate: start.toISOString(), earnedXp: 0, possibleXp: 0, lastAccrualWeek: null };

  m.accruePossibleXp(new Date(2026, 5, 29)); // four weeks later, no reviews submitted
  assert.equal(m.state.profile.season.possibleXp, 4 * 60, "4 weeks x the 60-point review envelope");
  assert.equal(m.state.profile.season.lastAccrualWeek, "2026-06-29", "anchored to this week's Monday");

  // Were missed weeks not charged, the denominator would shrink and a user who
  // did less would show a better ratio than one who did more.
  assert.equal(seasonPace(m.state.profile.season).ratio, 0);
});

test("the current week is never charged — you cannot be behind on a week still running", () => {
  const m = birthdayManager();
  const monday = new Date(2026, 5, 1);
  m.state.profile.season = { startDate: monday.toISOString(), earnedXp: 0, possibleXp: 0, lastAccrualWeek: null };
  m.accruePossibleXp(new Date(2026, 5, 3)); // Wednesday of the same week
  assert.equal(m.state.profile.season.possibleXp, 0);
  assert.equal(seasonPace(m.state.profile.season).ratio, null, "still 'just started', not 'behind'");
});

test("the accrual envelope counts active pledges, not just showing up", () => {
  const m = birthdayManager();
  m.state.goals = [{ id: "g1", templateId: "water", target: 2, streak: 0, lastResult: null }];
  assert.equal(m.weeklyXpEnvelope(), 60 + 25, "review 60 + water pledge 25");
});

test("accrual is idempotent within a week and survives a corrupt anchor", () => {
  const m = birthdayManager();
  m.state.profile.season = { startDate: new Date(2026, 5, 1).toISOString(), earnedXp: 0, possibleXp: 0, lastAccrualWeek: null };
  const now = new Date(2026, 5, 29);
  m.accruePossibleXp(now);
  const charged = m.state.profile.season.possibleXp;
  m.accruePossibleXp(now);
  assert.equal(m.state.profile.season.possibleXp, charged, "a second boot the same week charges nothing");

  m.state.profile.season.lastAccrualWeek = "not-a-date";
  m.state.profile.season.startDate = null;
  m.accruePossibleXp(now);
  assert.ok(Number.isFinite(m.state.profile.season.possibleXp), "no NaN reaches the pace ratio");
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
