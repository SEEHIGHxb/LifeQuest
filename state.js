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
  migrateV3State
} from "./sanitize.js";
import {
  rawSum, mentalComposite, relationshipsComposite, personalGoalsComposite,
  calculateFinanceScore, calculatePhysicalScore, calculateMentalScore,
  calculateRelationshipsScore, calculatePersonalGoalsScore,
  calculateSocialContributionScore, calculateEnvironmentScore,
  calculateHumanityFutureScore, deepAspectScore, weeklyAspectShifts,
  rankForLevel, rankClassForLevel
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

function getStorage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function dispatchAppEvent(name, detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

function isoWeekKey(date) {
  // Thursday-based ISO week number, keyed as "YYYY-Www"
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
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
  init() {
    if (!this.state.onboarded) return;
    if (this.maybeTakeSnapshot()) {
      this.saveState();
    }
  }

  // Merge parsed data over defaults so saves survive new same-schema fields.
  // Untrusted fields that reach innerHTML are coerced back to known shapes here
  // (see sanitize.js) so an imported backup can't smuggle in markup.
  mergeSavedState(parsed) {
    const defaults = structuredClone(DEFAULT_STATE);

    // Coerce the profile fields the UI prints unescaped (name/level/xp) and
    // derive rank from level so it is always a known enum, never trusted input.
    const profile = { ...defaults.profile, ...(parsed.profile || {}) };
    profile.name = safeString(profile.name, 60).trim() || "Guest";
    profile.level = Math.round(clampNumber(profile.level, 1, 999, 1));
    profile.xp = Math.round(clampNumber(profile.xp, 0, 100000000, 0));
    // Backfill the never-truncated lifetime-XP counter for saves that predate
    // it (finding #11): reconstruct total XP earned from level + current xp
    // (each level i costs i*100), since real history is capped. A genuine
    // counter already on the save is kept as-is.
    profile.lifetimeXp = (parsed.profile && Number.isFinite(parsed.profile.lifetimeXp))
      ? Math.round(clampNumber(parsed.profile.lifetimeXp, 0, 100000000, 0))
      : Math.round((100 * (profile.level - 1) * profile.level) / 2) + profile.xp;
    profile.rank = this.getRank(profile.level);
    sanitizeProfileFields(profile);

    return {
      ...defaults,
      ...parsed,
      profile,
      aspects: sanitizeAspectScores(parsed.aspects),
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
    // A v3 backup imports cleanly through the same migration as a v3 save.
    if (parsed.schemaVersion === 3) {
      parsed = migrateV3State(parsed);
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

  // Thin delegates kept for API stability (leaderboard + tests call them on
  // the instance); the lookups themselves live with the other pure functions.
  getRank(level) {
    return rankForLevel(level);
  }

  getRankClass(level) {
    return rankClassForLevel(level);
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
    p.level = 1;
    p.xp = 0;
    p.rank = this.getRank(1);

    this.state.goals = createDefaultPledges();
    this.state.snapshots = [];
    this.state.checkins = [];
    this.state.reviews = [];
    this.maybeTakeSnapshot(); // baseline snapshot anchors the trend charts
    this.saveState();
  }

  addXP(amount) {
    const p = this.state.profile;
    p.xp += amount;
    // Never-truncated lifetime total (finding #11): the shareable "points" read
    // from this, not the capped action history, so quest/commitment/check-in/
    // deep-assessment XP all count and the number never shrinks.
    p.lifetimeXp = (Number.isFinite(p.lifetimeXp) ? p.lifetimeXp : 0) + amount;
    let leveled = false;
    let xpNeeded = p.level * 100;
    while (p.xp >= xpNeeded) {
      p.xp -= xpNeeded;
      p.level += 1;
      leveled = true;
      xpNeeded = p.level * 100;
    }
    if (leveled) {
      p.rank = this.getRank(p.level);
      dispatchAppEvent("lifequest_levelup", { level: p.level, rank: p.rank });
    }
  }
}

// Construction only READS the saved state. The boot maintenance (the weekly
// snapshot) runs when app.js calls stateManager.init() — importing this
// module never writes to storage.
export const stateManager = new GameStateManager();
