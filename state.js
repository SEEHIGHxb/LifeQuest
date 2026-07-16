// state.js - LifeQuest state manager: persistence, XP/quests, recalibration.
// Extracted in finding #13: defaults.js (state shape + starter quests),
// sanitize.js (untrusted-import coercion), scoring.js (pure calculators).
// What remains is the stateful manager: load/save, XP, quests, check-ins.

import { t, tp } from "./i18n.js";
import { DEFAULT_STATE, createDefaultQuests } from "./defaults.js";
import {
  clampNumber, safeString, sanitizeAspectScores, sanitizeImportedFriend,
  sanitizeImportedCustomAction, sanitizeImportedGoal, sanitizeProfileFields
} from "./sanitize.js";
import {
  rawSum, mentalComposite, relationshipsComposite, personalGoalsComposite,
  calculateFinanceScore, calculatePhysicalScore, calculateMentalScore,
  calculateRelationshipsScore, calculatePersonalGoalsScore,
  calculateSocialContributionScore, calculateEnvironmentScore,
  calculateHumanityFutureScore, deepAspectScore,
  rankForLevel, rankClassForLevel
} from "./scoring.js";
import { INSTRUMENTS, DEEP_INSTRUMENTS } from "./surveys.js";
import { isStraightLined } from "./validation.js";

const STORAGE_KEY = "lifequest_state";
// A save the running code cannot read (corrupt JSON or an incompatible schema)
// is copied here instead of being silently overwritten, so it stays recoverable.
const RECOVERY_KEY = "lifequest_state_recovery";
const HISTORY_LIMIT = 500;
const DAILY_LOG_LIMIT = 5;
const SNAPSHOT_INTERVAL_DAYS = 7;
const SNAPSHOT_LIMIT = 260; // ~5 years of weekly snapshots

// Commitment mode: a weekly pledge to one aspect with a bonus on completion.
const COMMIT_MIN_TARGET = 3;
const COMMIT_MAX_TARGET = 21;
const COMMIT_BONUS_BASE_XP = 30;
const COMMIT_BONUS_PER_LOG_XP = 10;
const COMMIT_BONUS_CAP_XP = 150;

// Monthly mini re-assessment: short instruments recalibrate the survey-based
// aspects (hybrid model). A single check-in can never swing a score by more
// than CHECKIN_MAX_SHIFT points.
const CHECKIN_INTERVAL_DAYS = 28;
const CHECKIN_MAX_SHIFT = 15;
const CHECKIN_ACTIVITY_BONUS_CAP = 3;
const CHECKIN_LOGS_PER_BONUS_POINT = 3;
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
    const questsChanged = this.resetPeriodicQuests();
    const snapshotTaken = this.maybeTakeSnapshot();
    if (questsChanged || snapshotTaken) {
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
        ? parsed.goals.map(sanitizeImportedGoal).filter(Boolean)
        : [],
      customActions: Array.isArray(parsed.customActions)
        ? parsed.customActions.map(sanitizeImportedCustomAction).filter(Boolean)
        : [],
      dailyLimits: parsed.dailyLimits && typeof parsed.dailyLimits === "object" ? parsed.dailyLimits : {},
      questResets: { ...defaults.questResets, ...(parsed.questResets || {}) },
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(-SNAPSHOT_LIMIT) : [],
      baseline: parsed.baseline && typeof parsed.baseline === "object" ? parsed.baseline : null,
      commitment: parsed.commitment && typeof parsed.commitment === "object" ? parsed.commitment : null,
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
    // v3 changed the measurement model (quantified logs, demographics,
    // snapshots) — older saves restart onboarding for a clean baseline. The raw
    // save is kept so a future export/migrate can still reach the old data.
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
    if (this.state.history.length < BACKUP_NUDGE_MIN_LOGS) return false;
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

  // Daily quests reset each day, weekly quests each ISO week.
  // Returns true when anything changed (caller decides whether to save).
  resetPeriodicQuests() {
    const now = new Date();
    const today = now.toDateString();
    const week = isoWeekKey(now);
    let changed = false;

    if (this.state.questResets.daily !== today) {
      this.state.goals.forEach(g => {
        if (g.type === "daily") {
          g.completed = false;
          g.currentValue = 0;
        }
      });
      this.state.questResets.daily = today;
      changed = true;
    }
    if (this.state.questResets.weekly !== week) {
      this.state.goals.forEach(g => {
        if (g.type === "weekly") {
          g.completed = false;
          g.currentValue = 0;
        }
      });
      // Commitments renew each week: progress restarts, bonus earnable again.
      if (this.state.commitment) {
        this.state.commitment = { ...this.state.commitment, week, progress: 0, completed: false };
      }
      this.state.questResets.weekly = week;
      changed = true;
    }
    return changed;
  }

  // --- COMMITMENT MODE (weekly aspect pledge) ---

  commitBonusXp(weeklyTarget) {
    return Math.min(COMMIT_BONUS_CAP_XP, COMMIT_BONUS_BASE_XP + weeklyTarget * COMMIT_BONUS_PER_LOG_XP);
  }

  commitToAspect(aspectKey, weeklyTarget) {
    if (this.state.aspects[aspectKey] === undefined) return null;
    const target = Math.max(COMMIT_MIN_TARGET, Math.min(COMMIT_MAX_TARGET, parseInt(weeklyTarget || COMMIT_MIN_TARGET)));
    this.state.commitment = {
      aspect: aspectKey,
      weeklyTarget: target,
      week: isoWeekKey(new Date()),
      progress: 0,
      completed: false
    };
    this.saveState();
    return this.state.commitment;
  }

  clearCommitment() {
    this.state.commitment = null;
    this.saveState();
  }

  // Any log that positively moves the pledged aspect counts toward the week.
  applyCommitmentProgress(impacts) {
    const c = this.state.commitment;
    if (!c || c.completed) return;
    if ((impacts[c.aspect] || 0) <= 0) return;
    c.progress += 1;
    if (c.progress >= c.weeklyTarget) {
      c.completed = true;
      const bonus = this.commitBonusXp(c.weeklyTarget);
      this.addXP(bonus);
      dispatchAppEvent("lifequest_commitment_completed", { aspect: c.aspect, bonus });
    }
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

  countPositiveLogsSince(aspectKey, sinceIso) {
    const since = new Date(sinceIso).getTime();
    return this.state.history.filter(h =>
      new Date(h.timestamp).getTime() >= since && ((h.impacts || {})[aspectKey] || 0) > 0
    ).length;
  }

  // Re-runs the short survey instruments and recalibrates the survey-based
  // aspects toward the new reading, plus a small bonus for consistent related
  // logging since the last calibration. Shifts are capped at ±CHECKIN_MAX_SHIFT.
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

    const shifts = {};
    for (const [aspect, target] of Object.entries(targets)) {
      const logs = this.countPositiveLogsSince(aspect, since);
      const activityBonus = Math.min(CHECKIN_ACTIVITY_BONUS_CAP, Math.floor(logs / CHECKIN_LOGS_PER_BONUS_POINT));
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

    this.initializeDefaultQuests();
    this.resetPeriodicQuests();
    this.state.snapshots = [];
    this.state.commitment = null;
    this.state.checkins = [];
    this.maybeTakeSnapshot(); // baseline snapshot anchors the trend charts
    this.saveState();
  }

  initializeDefaultQuests() {
    this.state.goals = createDefaultQuests();
  }

  // --- CUSTOM ROUTINES ---

  addCustomAction(title, aspect, points, xp) {
    const pts = Math.max(1, Math.min(15, parseInt(points || 5)));
    const action = {
      id: "custom_" + crypto.randomUUID().slice(0, 8),
      title: String(title || "Custom Routine").trim(),
      aspect,
      impacts: { [aspect]: pts },
      xp: Math.max(5, Math.min(50, parseInt(xp || 15))),
      desc: `Custom routine (+${pts} ${aspect})`
    };
    this.state.customActions.push(action);
    this.saveState();
    return action;
  }

  removeCustomAction(actionId) {
    this.state.customActions = this.state.customActions.filter(a => a.id !== actionId);
    delete this.state.dailyLimits[actionId];
    this.saveState();
  }

  // --- ACTIONS LOGGING ---

  // quantity: optional {value, unit, label} with the real measured amount
  // (e.g., {value: 30, unit: "minutes"}) — the raw data for measured scoring.
  logAction(actionId, actionName, impacts, xpReward, quantity = null) {
    this.resetPeriodicQuests();

    const today = new Date().toDateString();
    if (!this.state.dailyLimits[actionId]) {
      this.state.dailyLimits[actionId] = { count: 0, lastUpdated: today };
    }

    const limit = this.state.dailyLimits[actionId];
    if (limit.lastUpdated !== today) {
      limit.count = 0;
      limit.lastUpdated = today;
    }

    if (limit.count >= DAILY_LOG_LIMIT) {
      return {
        ok: false,
        reason: tp('Daily limit reached for "{name}" (max {max} logs). Take a break and return tomorrow.', {
          name: t(actionName),
          max: DAILY_LOG_LIMIT
        })
      };
    }

    limit.count++;

    // Apply aspect impacts (clamped between 0 and 100)
    for (const [aspect, change] of Object.entries(impacts)) {
      if (this.state.aspects[aspect] !== undefined) {
        const val = this.state.aspects[aspect] + change;
        this.state.aspects[aspect] = Math.max(0, Math.min(100, val));
      }
    }

    this.addXP(xpReward);

    const entry = {
      id: crypto.randomUUID().slice(0, 9),
      actionId,
      actionName,
      timestamp: new Date().toISOString(),
      xpReward,
      impacts
    };
    if (quantity && Number.isFinite(parseFloat(quantity.value))) {
      entry.quantity = {
        value: parseFloat(quantity.value),
        unit: String(quantity.unit || ""),
        label: String(quantity.label || "")
      };
    }
    this.state.history.unshift(entry);
    if (this.state.history.length > HISTORY_LIMIT) {
      this.state.history.length = HISTORY_LIMIT;
    }

    this.applyGoalProgress(actionId, impacts);
    this.applyCommitmentProgress(impacts);

    // `persisted` is false when the write was rejected — the caller should not
    // show the reward animation for progress that didn't actually save.
    const persisted = this.saveState();
    return { ok: true, persisted };
  }

  // Quests progress from logged actions: by explicit actionIds when present,
  // otherwise by any positively-impacted aspect.
  applyGoalProgress(actionId, impacts) {
    const impactAspects = Object.entries(impacts)
      .filter(([, change]) => change > 0)
      .map(([aspect]) => aspect);

    this.state.goals.forEach(goal => {
      if (goal.completed) return;
      const matches = Array.isArray(goal.actionIds) && goal.actionIds.length > 0
        ? goal.actionIds.includes(actionId)
        : impactAspects.includes(goal.aspect);
      if (!matches) return;

      goal.currentValue = Math.min(goal.targetValue, goal.currentValue + 1);
      if (goal.milestones) {
        goal.milestones.forEach(m => {
          if (!m.completed && goal.currentValue >= m.at) m.completed = true;
        });
      }
      if (goal.currentValue >= goal.targetValue) {
        this.completeQuest(goal.id);
      }
    });
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

  completeQuest(goalId) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (goal && !goal.completed) {
      goal.completed = true;
      goal.currentValue = goal.targetValue;
      if (goal.milestones) {
        goal.milestones.forEach(m => m.completed = true);
      }
      this.addXP(goal.xpReward);
      dispatchAppEvent("lifequest_quest_completed", { title: goal.title, xp: goal.xpReward });
    }
  }
}

// Construction only READS the saved state. The boot maintenance (quest resets,
// weekly snapshot) runs when app.js calls stateManager.init() — importing this
// module never writes to storage.
export const stateManager = new GameStateManager();
