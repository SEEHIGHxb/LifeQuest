// state.js - LifeQuest state manager: persistence, XP, weekly reviews,
// recalibration. Extracted in finding #13: defaults.js (state shape),
// sanitize.js (untrusted-import coercion), scoring.js (pure calculators),
// goals.js (pledge templates + grading). What remains is the stateful
// manager: load/save, XP, weekly reviews, pledges, check-ins.

import { t, tp } from "./i18n.js";
import { DEFAULT_STATE } from "./defaults.js";
import {
  createDefaultPledges, createPledge, clampPledgeTarget, goalTemplate,
  gradeGoal, PLEDGE_LIMIT, WEEKLY_REVIEW_FIELDS
} from "./goals.js";
import {
  clampNumber, safeString, sanitizeAspectScores, sanitizeImportedFriend,
  sanitizeImportedGoal, sanitizeImportedReview, sanitizeProfileFields,
  migrateV3State, migrateV4State, LEVEL_YEAR_LIMIT,
  sanitizeSeason, sanitizeLastLevelUp, sanitizeBirthday, sanitizeLevelYears
} from "./sanitize.js";
import {
  isoWeekKey, accrueSeason, closeSeason, openSeason,
  mostRecentBirthday, birthdaysSince
} from "./season.js";
import {
  rawSum, mentalComposite, relationshipsComposite, personalGoalsComposite,
  calculateFinanceScore, calculatePhysicalScore, calculateMentalScore,
  calculateRelationshipsScore, calculatePersonalGoalsScore,
  calculateSocialContributionScore, calculateEnvironmentScore,
  calculateHumanityFutureScore, deepAspectScore, weeklyAspectShifts,
  ageBandShifts, profileEditShifts, clamp100
} from "./scoring.js";
import { INSTRUMENTS, DEEP_INSTRUMENTS } from "./surveys.js";
import { isStraightLined } from "./validation.js";

const STORAGE_KEY = "lifequest_state";
// A save the running code cannot read (corrupt JSON or an incompatible schema)
// is copied here instead of being silently overwritten, so it stays recoverable.
const RECOVERY_KEY = "lifequest_state_recovery";
const HISTORY_LIMIT = 500; // legacy pre-v4 archive cap (nothing writes it now)
const SNAPSHOT_INTERVAL_DAYS = 7;
const SNAPSHOT_LIMIT = 260; // ~5 years of weekly snapshots

// Weekly review: ONE measured self-report per ISO week replaces the old
// daily action logging. Base XP for showing up; met pledges add their own.
const WEEKLY_REVIEW_XP = 60;
const REVIEW_LIMIT = 260; // ~5 years of weekly reviews

// Monthly mini re-assessment: short instruments recalibrate the survey-based
// aspects (hybrid model). A single check-in can never swing a score by more
// than CHECKIN_MAX_SHIFT points.
const CHECKIN_INTERVAL_DAYS = 28;
const CHECKIN_MAX_SHIFT = 15;
const CHECKIN_ACTIVITY_BONUS_CAP = 3;
const CHECKIN_XP = 40;
const CHECKIN_LIMIT = 60; // ~5 years of monthly records

// One-time reward for completing an aspect's optional deep (long-form) section.
const DEEP_ASSESSMENT_XP = 60;

// Real crewmates added via shared Crew Codes on the Rankings tab.
const FRIEND_LIMIT = 50;

// Backup nudge: localStorage is evictable and a "clear site data" wipes it, so
// remind the user to export once they have enough logged to actually miss.
const BACKUP_NUDGE_DAYS = 30;
const BACKUP_NUDGE_MIN_LOGS = 10;

// The slow-moving profile fields the Profile page lets a user hand-edit. The
// fast, behaviour-driven quantities (sleep, water, activity, plastics...) are
// deliberately NOT here — those are measured in the weekly review, not typed in.
// name and age are coerced bespoke in updateProfile (name isn't an enum/number
// sanitizeProfileFields knows, and age is bounded tighter than the importer's
// 1-120). birthMonth/birthDay ride the existing setBirthday path, not this one.
const PROFILE_EDIT_ENUMS = ["gender", "region", "employment", "relationshipStatus"];
const PROFILE_EDIT_NUMERIC = ["income", "weight", "height", "digitalLiteracy"];
// The numeric fields whose hand-entry should upgrade the confidence tier: a
// value the user just typed is provided data, same as answering it at onboarding.
const PROFILE_EDIT_PROVIDED = ["income", "weight", "height", "digitalLiteracy"];
const AGE_MIN = 15;
const AGE_MAX = 100;

function getStorage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function dispatchAppEvent(name, detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

export class GameStateManager {
  // Construction only READS the save — no writes, no mutations. The boot
  // maintenance (period resets, weekly snapshot) is an explicit init() so that
  // merely importing this module never rewrites the user's data (finding #13).
  constructor() {
    this.state = this.loadState();
  }

  // Run-once boot maintenance. app.js calls this at startup; tests call it (or
  // not) explicitly. Safe to call again — every step is idempotent per period.
  //
  // Birthdays are processed BEFORE accrual on purpose: a level-up opens a fresh
  // season, and accruing first would charge the closing season for weeks the
  // user spent in it before the feature could measure them, then file that
  // season on a ratio it never had a chance to earn.
  init(now = new Date()) {
    if (!this.state.onboarded) return;
    const changed = [
      this.processBirthdays(now),
      this.accruePossibleXp(now),
      this.maybeTakeSnapshot()
    ];
    if (changed.some(Boolean)) this.saveState();
  }

  // --- AGE-AS-LEVEL (birthdays advance the level; XP never does) ---

  // What a fully-met week is worth: showing up, plus every active pledge.
  weeklyXpEnvelope() {
    return this.state.goals.reduce(
      (sum, goal) => sum + (goalTemplate(goal.templateId)?.xp || 0),
      WEEKLY_REVIEW_XP
    );
  }

  accruePossibleXp(now = new Date()) {
    const season = this.state.profile.season;
    const result = accrueSeason(season, this.weeklyXpEnvelope(), now);
    if (result.weeks === 0 && result.lastAccrualWeek === season.lastAccrualWeek) return false;
    season.possibleXp = result.possibleXp;
    season.lastAccrualWeek = result.lastAccrualWeek;
    return true;
  }

  // The single write path for the birthday. Returns false on a date that is not
  // real (month 13, 31 February) rather than storing a corrected one:
  // sanitizeBirthday rejects instead of clamping, because a clamped birthday
  // would fire a genuine level-up on a day the user never typed.
  setBirthday(month, day, now = new Date()) {
    const birthday = sanitizeBirthday(month, day);
    if (!birthday.birthMonth || !birthday.birthDay) return false;
    const p = this.state.profile;
    p.birthMonth = birthday.birthMonth;
    p.birthDay = birthday.birthDay;
    p.birthdayPromptDismissed = true; // answering the question also settles it
    // Dropping the anchor re-anchors to the most recent PAST occurrence of the
    // new date without levelling up (see processBirthdays). That is what makes
    // correcting a typo safe: no replayed years, and no level taken back.
    p.lastLevelUp = null;
    this.processBirthdays(now);
    this.saveState();
    return true;
  }

  // The prompt is a soft ask, so "not now" has to mean it. The year-review
  // screen stays reachable from the status card, so dismissing is never a dead
  // end — it just stops the dashboard asking.
  dismissBirthdayPrompt() {
    this.state.profile.birthdayPromptDismissed = true;
    this.saveState();
  }

  // Apply a hand edit from the Profile page. `edits` is a partial map of the
  // slow-moving fields (name, age, gender, region, employment,
  // relationshipStatus, income, weight, height, digitalLiteracy,
  // longTermInvestments). Score-affecting fields are re-measured through the
  // SAME formulas onboarding uses and applied as deltas (profileEditShifts) so
  // accumulated check-in/deep/weekly adjustments are preserved. No XP: editing
  // your own facts is a correction, not an achievement — and can't be farmed.
  // Birthday edits ride the existing setBirthday path (subtle level-up
  // semantics), so they are handled separately by the view, not here.
  updateProfile(edits = {}) {
    if (!this.state.onboarded) return { shifts: {} };
    const p = this.state.profile;

    // Build a candidate profile, coercing each editable field; behavioural
    // fields not in the lists below are carried through untouched.
    const candidate = { ...p };
    if (typeof edits.name === "string") {
      candidate.name = safeString(edits.name, 60).trim() || "Guest";
    }
    const ageEdited = edits.age !== undefined && String(edits.age).trim() !== "";
    if (ageEdited) {
      candidate.age = Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(Number(edits.age)) || p.age));
    }
    for (const key of PROFILE_EDIT_ENUMS) {
      if (edits[key] !== undefined) candidate[key] = edits[key];
    }
    for (const key of PROFILE_EDIT_NUMERIC) {
      if (edits[key] !== undefined && String(edits[key]).trim() !== "") candidate[key] = edits[key];
    }
    if (edits.longTermInvestments !== undefined) {
      candidate.longTermInvestments = edits.longTermInvestments === true || edits.longTermInvestments === "true";
    }

    // Snap enums + numerics back to known shapes (unknown enum -> its default,
    // out-of-range number -> clamped). Mutates and returns `candidate`; name is
    // untouched by it (handled above) and age is already within its bounds.
    const newProfile = sanitizeProfileFields(candidate);

    // Re-measure the affected aspects and apply as deltas — preserves layered
    // check-in/deep/weekly adjustments. Empty when nothing score-affecting moved.
    const shifts = this.state.baseline ? profileEditShifts(p, newProfile, this.state.baseline) : {};
    for (const [aspect, shift] of Object.entries(shifts)) {
      this.state.aspects[aspect] = Math.max(0, Math.min(100, this.state.aspects[aspect] + shift));
    }

    // Commit the edited fields onto the live profile.
    p.name = newProfile.name;
    p.age = newProfile.age;
    for (const key of [...PROFILE_EDIT_ENUMS, ...PROFILE_EDIT_NUMERIC]) p[key] = newProfile[key];
    p.longTermInvestments = newProfile.longTermInvestments;

    // A hand-entered number is provided data — upgrade the confidence tier for
    // the fields the user actually typed this time.
    const provided = { ...(p.provided || {}) };
    for (const key of PROFILE_EDIT_PROVIDED) {
      if (edits[key] !== undefined && String(edits[key]).trim() !== "") provided[key] = true;
    }
    p.provided = provided;

    // Level IS the user's age. It normally advances only on birthdays (the age
    // field here is the stale onboarding figure), so it is re-synced ONLY when
    // the user deliberately edits age — an edit that leaves age alone never
    // disturbs birthday-driven level-ups.
    if (ageEdited) p.level = Math.round(clampNumber(p.age, 1, 999, 1));

    this.maybeTakeSnapshot(); // reflect the new scores on the trend (weekly-gated)
    this.saveState();
    return { shifts };
  }

  processBirthdays(now = new Date()) {
    const p = this.state.profile;
    // No birthday, no level-ups. The prompt to set one is a soft ask, never a
    // blocking modal — an unanswered question must not freeze the app.
    if (!p.birthMonth || !p.birthDay) return false;

    // First time the birthday is known: anchor to the most recent past
    // occurrence WITHOUT levelling up. The user's level already equals their
    // age, so that birthday is already counted — firing here would hand them a
    // year they have not lived.
    if (!p.lastLevelUp) {
      p.lastLevelUp = {
        date: mostRecentBirthday(now, p.birthMonth, p.birthDay).toISOString(),
        lifetimeXpAt: p.lifetimeXp
      };
      return true;
    }

    const elapsed = birthdaysSince(new Date(p.lastLevelUp.date), now, p.birthMonth, p.birthDay);
    if (elapsed.length === 0) return false;

    const oldAge = p.age;
    for (const date of elapsed) {
      // The whole current season closes into the FIRST birthday crossed. With
      // a multi-year gap the later years file empty, which is honest: the app
      // was not running, so it has nothing to say about those years.
      this.state.levelYears.push(closeSeason(p.level, p.season));
      p.level += 1;
      p.age += 1;
      p.season = openSeason(date);
      p.lastLevelUp = { date: date.toISOString(), lifetimeXpAt: p.lifetimeXp };
    }
    if (this.state.levelYears.length > LEVEL_YEAR_LIMIT) {
      this.state.levelYears = this.state.levelYears.slice(-LEVEL_YEAR_LIMIT);
    }

    // Crossing the CFPB 62 band changes the finance score. Applied as a delta
    // so the user's accumulated check-in and deep adjustments survive.
    const shifts = ageBandShifts(p, oldAge, p.age, this.state.baseline);
    for (const [aspect, delta] of Object.entries(shifts)) {
      this.state.aspects[aspect] = clamp100(this.state.aspects[aspect] + delta);
    }

    dispatchAppEvent("lifequest_levelup", {
      level: p.level, years: elapsed.length, shifts
    });
    return true;
  }

  // Merge parsed data over defaults so saves survive new same-schema fields.
  // Untrusted fields that reach innerHTML are coerced back to known shapes here
  // (see sanitize.js) so an imported backup can't smuggle in markup.
  mergeSavedState(parsed) {
    const defaults = structuredClone(DEFAULT_STATE);

    // Coerce the profile fields the UI prints unescaped (name/level/xp) back to
    // known shapes so an imported backup can't smuggle in markup.
    const profile = { ...defaults.profile, ...(parsed.profile || {}) };
    profile.name = safeString(profile.name, 60).trim() || "Guest";
    // Level is the user's age now, so it no longer has an XP ladder underneath
    // it. The lifetime-XP backfill for pre-counter saves moved into
    // migrateV4State, where the old earned level is still readable — see the
    // ordering note there.
    profile.level = Math.round(clampNumber(profile.level, 1, 999, 1));
    profile.lifetimeXp = Math.round(clampNumber(profile.lifetimeXp, 0, 100000000, 0));
    profile.season = sanitizeSeason(profile.season);
    profile.lastLevelUp = sanitizeLastLevelUp(profile.lastLevelUp);
    const birthday = sanitizeBirthday(profile.birthMonth, profile.birthDay);
    profile.birthMonth = birthday.birthMonth;
    profile.birthDay = birthday.birthDay;
    // Strict === true: any other value (missing, "false", 1) leaves the prompt
    // showing. Erring toward asking once too often beats a stray truthy import
    // silently burying the only question that makes level-ups work.
    profile.birthdayPromptDismissed = profile.birthdayPromptDismissed === true;
    delete profile.xp; // v4 field; its balance lives in season.earnedXp
    sanitizeProfileFields(profile);

    return {
      ...defaults,
      ...parsed,
      profile,
      aspects: sanitizeAspectScores(parsed.aspects),
      levelYears: sanitizeLevelYears(parsed.levelYears),
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      goals: Array.isArray(parsed.goals)
        ? parsed.goals.map(sanitizeImportedGoal).filter(Boolean).slice(0, PLEDGE_LIMIT)
        : [],
      reviews: Array.isArray(parsed.reviews)
        ? parsed.reviews.slice(-REVIEW_LIMIT).map(sanitizeImportedReview).filter(Boolean)
        : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(-SNAPSHOT_LIMIT) : [],
      baseline: parsed.baseline && typeof parsed.baseline === "object" ? parsed.baseline : null,
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins.slice(-CHECKIN_LIMIT) : [],
      friends: Array.isArray(parsed.friends)
        ? parsed.friends.slice(0, FRIEND_LIMIT).map(sanitizeImportedFriend).filter(Boolean)
        : [],
      // An ISO string or null. A garbage stamp must not read as "recently
      // backed up" and silence the nudge, so anything unparseable becomes null.
      // Tested as a string first: new Date(null) is the epoch, not NaN, and
      // would otherwise sneak past a bare date check.
      lastExportAt: (typeof parsed.lastExportAt === "string"
        && Number.isFinite(new Date(parsed.lastExportAt).getTime()))
        ? parsed.lastExportAt.slice(0, 40)
        : null,
      schemaVersion: DEFAULT_STATE.schemaVersion
    };
  }

  loadState() {
    const defaults = structuredClone(DEFAULT_STATE);
    let saved = null;
    try {
      saved = getStorage()?.getItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to read state from localStorage:", e);
      return defaults;
    }
    if (!saved) return defaults;

    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch (e) {
      // Corrupt JSON. Older code discarded it and the next write clobbered it
      // forever; instead keep the raw text so the user can still recover it.
      console.error("Saved state is not valid JSON; kept for recovery:", e);
      this.preserveUnreadableSave(saved);
      return defaults;
    }
    // v4 (the weekly-review redesign) migrates a v3 save in place: XP, scores,
    // baseline, and history all carry over; only the retired daily-logging
    // machinery is dropped or converted (see migrateV3State).
    if (parsed.schemaVersion === 3) {
      parsed = migrateV3State(parsed);
    }
    // v5 (age-as-level) migrates a v4 save in place. Chained after the v3 step
    // above, so a v3 save walks v3 -> v4 -> v5 in one load rather than being
    // discarded for being two versions behind.
    if (parsed.schemaVersion === 4) {
      parsed = migrateV4State(parsed);
    }
    // Pre-v3 saves changed the measurement model itself (quantified logs,
    // demographics, snapshots) — those restart onboarding for a clean baseline.
    // The raw save is kept so a future export/migrate can still reach the data.
    if (parsed.schemaVersion !== DEFAULT_STATE.schemaVersion) {
      console.info(`LifeQuest: schema v${parsed.schemaVersion || 1} save found; v${DEFAULT_STATE.schemaVersion} requires a fresh baseline. Previous data kept for recovery.`);
      this.preserveUnreadableSave(saved);
      return defaults;
    }
    return this.mergeSavedState(parsed);
  }

  // --- UNREADABLE-SAVE RECOVERY (never silently overwrite the user's data) ---

  // Copy a save the app couldn't load into RECOVERY_KEY so the next write to
  // STORAGE_KEY doesn't destroy it. Only the FIRST failure is kept — a later
  // good save won't clobber it, and a second failure won't overwrite the first.
  preserveUnreadableSave(raw) {
    const storage = getStorage();
    if (!storage) return;
    try {
      if (storage.getItem(RECOVERY_KEY) == null) {
        storage.setItem(RECOVERY_KEY, raw);
      }
    } catch (e) {
      console.error("Failed to preserve unreadable save:", e);
    }
  }

  hasRecoverableSave() {
    try {
      return getStorage()?.getItem(RECOVERY_KEY) != null;
    } catch {
      return false;
    }
  }

  getRecoverableSave() {
    try {
      return getStorage()?.getItem(RECOVERY_KEY) ?? null;
    } catch {
      return null;
    }
  }

  clearRecoverableSave() {
    try {
      getStorage()?.removeItem(RECOVERY_KEY);
    } catch (e) {
      console.error("Failed to clear recovery save:", e);
    }
  }

  // --- SNAPSHOTS (weekly aspect history for trend charts) ---

  maybeTakeSnapshot() {
    if (!this.state.onboarded) return false;
    const last = this.state.snapshots[this.state.snapshots.length - 1];
    if (last) {
      const daysSince = (Date.now() - new Date(last.date).getTime()) / 86400000;
      if (daysSince < SNAPSHOT_INTERVAL_DAYS) return false;
    }
    this.state.snapshots.push({
      date: new Date().toISOString(),
      aspects: { ...this.state.aspects }
    });
    if (this.state.snapshots.length > SNAPSHOT_LIMIT) {
      this.state.snapshots = this.state.snapshots.slice(-SNAPSHOT_LIMIT);
    }
    return true;
  }

  // --- BACKUP EXPORT / IMPORT ---

  // Stamping before serialising means the backup records its own export time,
  // and the nudge below goes quiet as soon as the user actually backs up.
  exportState() {
    this.state.lastExportAt = new Date().toISOString();
    this.saveState();
    return JSON.stringify(this.state, null, 2);
  }

  // Whole days since the last export, or null if the user has never exported.
  // A future-dated stamp (clock skew, hand-edited backup) clamps to 0 rather
  // than reporting a negative age.
  daysSinceLastExport() {
    const stamp = this.state.lastExportAt;
    if (!stamp) return null;
    const ms = new Date(stamp).getTime();
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
  }

  // True once there is real data worth losing and the last backup is stale
  // (or never happened). Everything here lives in localStorage, which the
  // browser may evict under pressure and which any "clear site data" wipes —
  // so this is the only warning a user gets before the data is simply gone.
  needsBackupNudge() {
    if (!this.state.onboarded) return false;
    // Worth nudging once a couple of weekly reviews exist — or, for migrated
    // saves, once the legacy action archive alone is worth keeping.
    const hasData = this.state.reviews.length >= 2
      || this.state.history.length >= BACKUP_NUDGE_MIN_LOGS;
    if (!hasData) return false;
    const days = this.daysSinceLastExport();
    return days === null || days >= BACKUP_NUDGE_DAYS;
  }

  // Ask the browser to exempt our origin from storage eviction. Best-effort:
  // Chrome grants it silently on an engaged/installed origin, Firefox may
  // prompt, Safari has no such API — hence the guarded call and no UI on
  // failure. Never throws; resolves to whether storage is now persistent.
  async requestPersistentStorage() {
    try {
      if (!navigator.storage?.persist) return false;
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch (e) {
      console.error("Persistent storage request failed:", e);
      return false;
    }
  }

  importState(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(t("File is not valid JSON."));
    }
    if (!parsed || typeof parsed !== "object" || !parsed.profile || !parsed.aspects) {
      throw new Error(t("This file is not a valid backup (missing profile/aspects)."));
    }
    // A v3 or v4 backup imports cleanly through the same migration chain as a
    // save of that vintage — same functions, same order, so an import and a
    // reload can never disagree about what a given backup means.
    if (parsed.schemaVersion === 3) {
      parsed = migrateV3State(parsed);
    }
    if (parsed.schemaVersion === 4) {
      parsed = migrateV4State(parsed);
    }
    if (parsed.schemaVersion !== DEFAULT_STATE.schemaVersion) {
      throw new Error(tp("Backup schema v{found} is not compatible with v{expected}.", {
        found: parsed.schemaVersion || 1,
        expected: DEFAULT_STATE.schemaVersion
      }));
    }
    this.state = this.mergeSavedState(parsed);
    this.saveState();
  }

  // Returns true when the write actually landed. On failure (storage full, or
  // Safari Private Mode where setItem throws) it reports back instead of
  // pretending success: a global listener warns the user and callers can
  // suppress the "reward" UI so nothing is celebrated that wasn't persisted.
  saveState() {
    try {
      getStorage()?.setItem(STORAGE_KEY, JSON.stringify(this.state));
      return true;
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
      dispatchAppEvent("lifequest_storage_error", { message: String((e && e.message) || e) });
      return false;
    }
  }

  resetState() {
    this.state = structuredClone(DEFAULT_STATE);
    this.saveState();
  }

  // --- WEEKLY REVIEW (one measured self-report per ISO week) ---

  lastReview() {
    return this.state.reviews[this.state.reviews.length - 1] || null;
  }

  // Due once per ISO week. The onboarding baseline counts as that week's
  // measurement, so the first review comes due the following week.
  isWeeklyReviewDue() {
    if (!this.state.onboarded || !this.state.baseline) return false;
    const currentWeek = isoWeekKey(new Date());
    const last = this.lastReview();
    if (last) return last.week !== currentWeek;
    return isoWeekKey(new Date(this.state.baseline.date)) !== currentWeek;
  }

  countReviewsSince(sinceIso) {
    const since = new Date(sinceIso).getTime();
    return this.state.reviews.filter(r => new Date(r.date).getTime() >= since).length;
  }

  // The weekly review: write the reported quantities into the profile,
  // re-measure the behavior-driven aspects through the shared scoring
  // formulas, grade every pledge against the measured week, and record it
  // all. Refuses a second submission in the same ISO week (the review UI
  // never offers one) so the base XP can't be farmed.
  submitWeeklyReview(inputs) {
    if (!this.state.onboarded || !this.state.baseline) return null;
    const week = isoWeekKey(new Date());
    const last = this.lastReview();
    if (last && last.week === week) return null;

    const p = this.state.profile;

    // Only the known weekly fields are read, only finite numbers land, and
    // the merged candidate profile is range-clamped before any math sees it.
    const submitted = {};
    for (const field of WEEKLY_REVIEW_FIELDS) {
      const n = Number(inputs && inputs[field]);
      if (Number.isFinite(n)) submitted[field] = n;
    }
    const newProfile = sanitizeProfileFields({ ...p, ...submitted });

    // Measured re-scoring, computed BEFORE the profile is overwritten (the
    // delta needs old vs new). Deltas preserve check-in/deep adjustments.
    const shifts = weeklyAspectShifts(p, newProfile, this.state.baseline);
    for (const [aspect, shift] of Object.entries(shifts)) {
      this.state.aspects[aspect] = Math.max(0, Math.min(100, this.state.aspects[aspect] + shift));
    }

    // Write the measured values and mark them provided — a weekly-measured
    // field is confirmed data, so confidence tiers upgrade honestly.
    const provided = { ...(p.provided || {}) };
    for (const field of Object.keys(submitted)) {
      p[field] = newProfile[field];
      provided[field] = true;
    }
    p.provided = provided;

    // Grade every pledge against the measured week.
    let goalXp = 0;
    const goalResults = this.state.goals.map(goal => {
      const graded = gradeGoal(goal, p);
      goal.lastResult = { week, value: graded.value, met: graded.met };
      goal.streak = graded.met ? (goal.streak || 0) + 1 : 0;
      if (graded.met) goalXp += goalTemplate(goal.templateId).xp;
      return { id: goal.id, templateId: goal.templateId, target: goal.target, value: graded.value, met: graded.met };
    });

    const xp = WEEKLY_REVIEW_XP + goalXp;
    const record = {
      date: new Date().toISOString(),
      week,
      inputs: submitted,
      shifts,
      goals: goalResults,
      xp
    };
    this.state.reviews.push(record);
    if (this.state.reviews.length > REVIEW_LIMIT) {
      this.state.reviews = this.state.reviews.slice(-REVIEW_LIMIT);
    }
    this.addXP(xp);
    this.maybeTakeSnapshot();

    // `persisted` is false when the write was rejected — the caller should not
    // show the reward animation for progress that didn't actually save.
    const persisted = this.saveState();
    return { ...record, persisted };
  }

  // --- PLEDGES (weekly quantity goals) ---

  addPledge(templateId, target) {
    if (this.state.goals.length >= PLEDGE_LIMIT) {
      return { ok: false, reason: tp("Pledge list is full (max {max}).", { max: PLEDGE_LIMIT }) };
    }
    if (this.state.goals.some(g => g.templateId === templateId)) {
      return { ok: false, reason: t("You already have a pledge on that metric.") };
    }
    const pledge = createPledge(templateId, target);
    if (!pledge) {
      return { ok: false, reason: t("Unknown pledge type.") };
    }
    this.state.goals.push(pledge);
    this.saveState();
    return { ok: true, pledge };
  }

  removePledge(pledgeId) {
    this.state.goals = this.state.goals.filter(g => g.id !== pledgeId);
    this.saveState();
  }

  updatePledgeTarget(pledgeId, target) {
    const goal = this.state.goals.find(g => g.id === pledgeId);
    if (!goal) return null;
    goal.target = clampPledgeTarget(goal.templateId, target);
    this.saveState();
    return goal;
  }

  // --- CREW ROSTER (real friends from shared Crew Codes) ---

  // Re-importing a crewmate's newer code replaces their entry (matched by
  // name, case-insensitive) instead of duplicating them.
  addFriend(friend) {
    const existing = this.state.friends.find(
      f => f.name.toLowerCase() === friend.name.toLowerCase()
    );
    if (existing) {
      Object.assign(existing, friend, { addedAt: new Date().toISOString() });
      this.saveState();
      return { ok: true, updated: true, friend: existing };
    }
    if (this.state.friends.length >= FRIEND_LIMIT) {
      return { ok: false, reason: tp("Participant list is full (max {max}).", { max: FRIEND_LIMIT }) };
    }
    const entry = {
      id: "crew_" + crypto.randomUUID().slice(0, 8),
      addedAt: new Date().toISOString(),
      ...friend
    };
    this.state.friends.push(entry);
    this.saveState();
    return { ok: true, updated: false, friend: entry };
  }

  removeFriend(friendId) {
    this.state.friends = this.state.friends.filter(f => f.id !== friendId);
    this.saveState();
  }

  // --- MONTHLY MINI RE-ASSESSMENT (hybrid model recalibration) ---

  lastCalibrationDate() {
    const lastCheckin = this.state.checkins[this.state.checkins.length - 1];
    if (lastCheckin) return lastCheckin.date;
    return this.state.baseline ? this.state.baseline.date : null;
  }

  isCheckinDue() {
    if (!this.state.onboarded || !this.state.baseline) return false;
    const last = this.lastCalibrationDate();
    if (!last) return false;
    return (Date.now() - new Date(last).getTime()) / 86400000 >= CHECKIN_INTERVAL_DAYS;
  }

  // Re-runs the short survey instruments and recalibrates the survey-based
  // aspects toward the new reading, plus a small bonus for consistent weekly
  // reviews since the last calibration. Shifts are capped at ±CHECKIN_MAX_SHIFT.
  // Targets come from the shared composites in scoring.js — the SAME functions
  // onboarding uses — so a check-in can never drift from the baseline formula.
  submitCheckin(surveyData) {
    const p = this.state.profile;
    const b = this.state.baseline;
    if (!b) return null;

    const sums = {
      who5: rawSum(surveyData.who5),
      st5: rawSum(surveyData.st5),
      ucla: rawSum(surveyData.ucla),
      gse: rawSum(surveyData.gse),
      ras: p.relationshipStatus === "Single" ? null : rawSum(surveyData.ras)
    };
    const since = this.lastCalibrationDate();

    // LSNS and grit aren't re-asked monthly, so their stored baseline sums
    // stand in; everything else uses the fresh reading.
    const targets = {
      mental: mentalComposite(sums.who5, sums.st5),
      relationships: relationshipsComposite(b.lsns, sums.ucla, sums.ras),
      personalGoals: personalGoalsComposite(p, sums.gse, b.grit)
    };

    // One consistent week of measurement ≈ one bonus point, capped.
    const activityBonus = Math.min(CHECKIN_ACTIVITY_BONUS_CAP, this.countReviewsSince(since));

    const shifts = {};
    for (const [aspect, target] of Object.entries(targets)) {
      const current = this.state.aspects[aspect];
      const shift = Math.max(-CHECKIN_MAX_SHIFT, Math.min(CHECKIN_MAX_SHIFT, Math.round(target + activityBonus - current)));
      shifts[aspect] = shift;
      this.state.aspects[aspect] = Math.max(0, Math.min(100, current + shift));
    }

    // Refresh the stored raw sums so benchmarks track the latest reading, and
    // mark the re-asked instruments as answered so Phase 2 confidence upgrades:
    // a deepened score should stop reading as "Estimated". Only who5/st5/ucla/gse
    // (+ras when coupled) are re-asked here — lsns/grit keep their captured
    // coverage, so relationships/personalGoals may honestly stay "Partial".
    const answered = { ...(b.answered || {}), who5: true, st5: true, ucla: true, gse: true };
    if (sums.ras !== null) answered.ras = true;
    this.state.baseline = { ...b, who5: sums.who5, st5: sums.st5, ucla: sums.ucla, gse: sums.gse, ras: sums.ras ?? b.ras, answered };

    this.state.checkins.push({ date: new Date().toISOString(), sums, shifts });
    if (this.state.checkins.length > CHECKIN_LIMIT) {
      this.state.checkins = this.state.checkins.slice(-CHECKIN_LIMIT);
    }
    this.addXP(CHECKIN_XP);
    this.saveState();
    return shifts;
  }

  // --- DEEP ASSESSMENT (optional long-form recalibration) ---

  // Records the full-length instruments for one aspect section and recomputes
  // that aspect from the richer signal. Non-destructive: raw deep sums live in
  // baseline.deep, coverage in baseline.deepAnswered, and completed sections in
  // baseline.deepDone. Requires an existing onboarding baseline.
  submitDeepAssessment(aspectKey, deepData) {
    const b = this.state.baseline;
    if (!b) return null;

    const deep = { ...(b.deep || {}) };
    const deepAnswered = { ...(b.deepAnswered || {}) };
    const deepFlagged = { ...(b.deepFlagged || {}) };
    let anyFlagged = false;
    for (const [key, arr] of Object.entries(deepData)) {
      if (!Array.isArray(arr)) continue;
      // Response quality (G3): a straight-lined long-form instrument (same
      // option position on every item despite reverse-keyed items — including
      // an untouched all-defaults submission) is rejected outright: careless
      // data never enters scoring and cannot mark the section verified.
      if (isStraightLined(DEEP_INSTRUMENTS[key], arr)) {
        deepFlagged[key] = true;
        anyFlagged = true;
        continue;
      }
      delete deepFlagged[key]; // an honest retake clears an earlier flag
      deep[key] = rawSum(arr);
      deepAnswered[key] = true;
    }
    const deepDone = { ...(b.deepDone || {}) };
    if (!anyFlagged) deepDone[aspectKey] = true;
    this.state.baseline = { ...b, deep, deepAnswered, deepDone, deepFlagged };

    const newScore = deepAspectScore(aspectKey, this.state.profile, this.state.baseline, this.state.aspects[aspectKey]);
    if (newScore !== null) this.state.aspects[aspectKey] = newScore;

    // No reward for a flagged submission — straight-lining must not farm XP.
    if (!anyFlagged) this.addXP(DEEP_ASSESSMENT_XP);
    this.saveState();
    return { score: this.state.aspects[aspectKey], flagged: anyFlagged };
  }

  // --- ONBOARDING ---

  // Set the onboarding baseline. `coverage` (optional) carries the Phase 1
  // input-coverage maps captured at input time: { provided: {field: bool},
  // answered: {instrument: bool} }. When absent (e.g. older callers), the
  // flags are simply not written — an absent flag reads as "unknown."
  submitOnboarding(surveyData, express = false, coverage = null) {
    const p = this.state.profile;

    p.name = (surveyData.name || "").trim() || "Guest";
    p.age = Math.max(15, Math.min(100, parseInt(surveyData.age || 25)));
    p.gender = ["male", "female"].includes(surveyData.gender) ? surveyData.gender : "unspecified";
    p.region = surveyData.region;
    p.employment = surveyData.employment;
    p.relationshipStatus = surveyData.relationshipStatus;
    p.income = parseFloat(surveyData.income || 0);
    p.savingsRate = parseFloat(surveyData.savingsRate || 0);
    p.digitalLiteracy = parseFloat(surveyData.digitalLiteracy || 50);
    p.weeklyLearningHours = parseFloat(surveyData.weeklyLearningHours || 0);
    p.weeklyVigorousDays = parseInt(surveyData.weeklyVigorousDays || 0);
    p.weeklyVigorousMins = parseInt(surveyData.weeklyVigorousMins || 0);
    p.weeklyModerateDays = parseInt(surveyData.weeklyModerateDays || 0);
    p.weeklyModerateMins = parseInt(surveyData.weeklyModerateMins || 0);
    p.weeklyWalkingDays = parseInt(surveyData.weeklyWalkingDays || 0);
    p.weeklyWalkingMins = parseInt(surveyData.weeklyWalkingMins || 0);
    p.weight = parseFloat(surveyData.weight || 60);
    p.height = parseFloat(surveyData.height || 170);
    p.sleepHours = parseFloat(surveyData.sleepHours || 7);
    p.vegetablePortions = parseFloat(surveyData.vegetablePortions || 0);
    p.waterLiters = parseFloat(surveyData.waterLiters || 0);
    p.singleUsePlastics = parseInt(surveyData.singleUsePlastics || 0);
    p.monthlyDonations = parseFloat(surveyData.monthlyDonations || 0);
    p.volunteeringHours = parseFloat(surveyData.volunteeringHours || 0);
    p.longTermInvestments = surveyData.longTermInvestments === "true";

    // Raw instrument sums preserved for benchmark percentiles and the
    // Phase 4 monthly re-assessments.
    this.state.baseline = {
      date: new Date().toISOString(),
      cfpb: rawSum(surveyData.cfpb),
      jss: rawSum(surveyData.jss),
      st5: rawSum(surveyData.st5),
      who5: rawSum(surveyData.who5),
      lsns: rawSum(surveyData.lsns),
      ucla: rawSum(surveyData.ucla),
      ras: p.relationshipStatus === "Single" ? null : rawSum(surveyData.ras),
      gse: rawSum(surveyData.gse),
      grit: rawSum(surveyData.grit),
      ptm: rawSum(surveyData.ptm),
      geb: rawSum(surveyData.geb),
      lfis: rawSum(surveyData.lfis)
    };

    // Coverage flags let later phases tell an answered instrument/field from a
    // defaulted one. Stored only when captured, so older saves stay "unknown".
    if (coverage && coverage.answered) {
      this.state.baseline.answered = { ...coverage.answered };
    }
    if (coverage && coverage.provided) {
      p.provided = { ...coverage.provided };
    }

    // Response quality (G3): an instrument the user DID answer but whose
    // responses all sit at the same option position despite mixed keying reads
    // as careless. It is demoted to unanswered — the confidence machinery then
    // treats it as unconfirmed — and flagged so the aspect page can prompt a
    // re-answer. Only judged when coverage was captured; untouched instruments
    // are already handled by answered=false.
    if (this.state.baseline.answered) {
      const flagged = {};
      for (const [key, instr] of Object.entries(INSTRUMENTS)) {
        if (this.state.baseline.answered[key] === true && isStraightLined(instr, surveyData[key])) {
          this.state.baseline.answered[key] = false;
          flagged[key] = true;
        }
      }
      this.state.baseline.flagged = flagged;
    }

    const aspects = this.state.aspects;
    aspects.finance = calculateFinanceScore(p, surveyData.cfpb);
    aspects.physical = calculatePhysicalScore(p, surveyData.jss);
    aspects.mental = calculateMentalScore(p, surveyData.st5, surveyData.who5);
    aspects.relationships = calculateRelationshipsScore(p, surveyData.lsns, surveyData.ucla, surveyData.ras);
    aspects.personalGoals = calculatePersonalGoalsScore(p, surveyData.gse, surveyData.grit);
    aspects.socialContribution = calculateSocialContributionScore(p, surveyData.ptm);
    aspects.environment = calculateEnvironmentScore(p, surveyData.geb);
    aspects.humanityFuture = calculateHumanityFutureScore(p, surveyData.lfis);

    this.state.onboarded = true;
    p.assessmentComplete = !express;
    // Level opens at the user's real age — nobody starts life at 1 — and the
    // first season opens with it. lifetimeXp is deliberately NOT reset here:
    // it survives a re-onboard the same way it survives a migration.
    p.level = Math.round(clampNumber(p.age, 1, 999, 1));
    p.season = {
      startDate: new Date().toISOString(),
      earnedXp: 0,
      possibleXp: 0,
      lastAccrualWeek: null
    };
    p.lastLevelUp = null;
    this.state.levelYears = [];
    this.state.goals = createDefaultPledges();
    this.state.snapshots = [];
    this.state.checkins = [];
    this.state.reviews = [];

    // Last, once levelYears is empty and the season is open. Blank or
    // impossible input leaves the birthday null: the question is optional, and
    // declining it costs only future level-ups, never the assessment itself.
    // With a date, processBirthdays ANCHORS to the most recent past birthday
    // without levelling — the level already equals the stated age, so firing
    // here would hand out a year the user has not lived.
    const birthday = sanitizeBirthday(surveyData.birthMonth, surveyData.birthDay);
    p.birthMonth = birthday.birthMonth;
    p.birthDay = birthday.birthDay;
    this.processBirthdays();

    this.maybeTakeSnapshot(); // baseline snapshot anchors the trend charts
    this.saveState();
  }

  // XP no longer causes level-ups — birthdays do (see defaults.js). The old
  // `while (xp >= level*100)` loop is gone entirely: it made Level a measure of
  // how much the app had been used, which is a fact about the app rather than
  // about the person.
  addXP(amount) {
    const p = this.state.profile;
    // Never-truncated lifetime total (finding #11): the shareable "points" read
    // from this, not the capped action history, so review/check-in/deep-
    // assessment XP all count and the number never shrinks.
    p.lifetimeXp = (Number.isFinite(p.lifetimeXp) ? p.lifetimeXp : 0) + amount;
    p.season.earnedXp += amount;
  }
}

// Construction only READS the saved state. The boot maintenance (the weekly
// snapshot) runs when app.js calls stateManager.init() — importing this
// module never writes to storage.
export const stateManager = new GameStateManager();
