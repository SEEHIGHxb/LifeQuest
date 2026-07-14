// state.js - LifeQuest State Management & Scientific Scoring

import { t, tp } from "./i18n.js";

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

const DEFAULT_STATE = {
  onboarded: false,
  schemaVersion: 3,
  profile: {
    name: "Guest",
    level: 1,
    xp: 0,
    rank: "Foundational",
    assessmentComplete: true, // false only after a quick-start (express) baseline

    age: 25,
    gender: "unspecified", // male, female, unspecified — for benchmark norm selection
    region: "Provinces", // Provinces or Bangkok
    employment: "Office Worker", // Office Worker, Freelancer, Business Owner, Unemployed, Student
    relationshipStatus: "Single", // Single, Coupled
    income: 15000,
    savingsRate: 10,
    digitalLiteracy: 50,
    weeklyLearningHours: 2,
    weeklyVigorousDays: 0,
    weeklyVigorousMins: 0,
    weeklyModerateDays: 0,
    weeklyModerateMins: 0,
    weeklyWalkingDays: 3,
    weeklyWalkingMins: 20,
    weight: 60,
    height: 170,
    sleepHours: 7,
    vegetablePortions: 2,
    waterLiters: 1.5,
    singleUsePlastics: 5,
    monthlyDonations: 0,
    volunteeringHours: 0,
    longTermInvestments: false
  },
  aspects: {
    finance: 0,
    physical: 0,
    mental: 0,
    relationships: 0,
    personalGoals: 0,
    socialContribution: 0,
    environment: 0,
    humanityFuture: 0
  },
  history: [],
  goals: [],
  customActions: [],
  dailyLimits: {},
  questResets: { daily: "", weekly: "" },
  snapshots: [], // weekly {date, aspects} records for trend charts
  baseline: null, // raw instrument sums from onboarding, for benchmark percentiles
  commitment: null, // active weekly aspect pledge {aspect, weeklyTarget, week, progress, completed}
  checkins: [], // monthly mini re-assessment records {date, sums, shifts}
  friends: [] // crewmates imported from Crew Codes {id, name, level, totalPoints, aspects, addedAt}
};

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

// ST-5 raw (0-15) -> stress-resilience 0-100 (higher = calmer). Same DMH bands
// as calculateMentalScore; shared so the deep recompute stays consistent.
function stressResilienceFromSt5(st5) {
  if (st5 <= 4) return 100 - st5 * 10;
  if (st5 <= 7) return 60 - (st5 - 4) * 10;
  if (st5 <= 9) return 30 - (st5 - 7) * 10;
  return 0;
}

// --- IMPORT SANITIZERS (defence-in-depth for backup import / reload) ---
//
// A saved/imported state is untrusted input: a hand-edited backup can carry
// hostile strings that reach innerHTML sinks. These coerce imported data back to
// known shapes so nothing can smuggle markup through the header, leaderboard, or
// aspect labels. Escaping still happens at each sink too — this is belt AND
// suspenders, not a replacement for it.
const ASPECT_SCORE_KEYS = Object.keys(DEFAULT_STATE.aspects);
const SAFE_ID_RE = /[^A-Za-z0-9_-]/g;

// Finite number clamped to [min, max]; `fallback` when the value isn't numeric.
function clampNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Plain string, length-capped. Non-strings collapse to "".
function safeString(value, maxLen = 200) {
  return typeof value === "string" ? value.slice(0, maxLen) : "";
}

// Reduce an id to a safe [A-Za-z0-9_-] token so it can never break out of the
// HTML attribute it is rendered into. Empty results get a fresh prefixed id.
function safeId(value, prefix) {
  const cleaned = safeString(value, 40).replace(SAFE_ID_RE, "");
  return cleaned || `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

// Keep ONLY the eight known aspect keys, each a clamped 0-100 number. Unknown
// keys are dropped: they would otherwise be echoed verbatim as labels into
// innerHTML (a stored-XSS sink) and corrupt the score math.
function sanitizeAspectScores(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of ASPECT_SCORE_KEYS) {
    out[key] = clampNumber(src[key], 0, 100, 0);
  }
  return out;
}

// Rebuild an imported crewmate to a known, type-safe shape (its id/level/points
// are rendered into the leaderboard without escaping upstream of here).
function sanitizeImportedFriend(f) {
  if (!f || typeof f !== "object") return null;
  const name = safeString(f.name, 40).trim();
  if (!name) return null;
  return {
    id: safeId(f.id, "crew"),
    name,
    level: Math.round(clampNumber(f.level, 1, 999, 1)),
    totalPoints: Math.round(clampNumber(f.totalPoints, 0, 10000000, 0)),
    aspects: sanitizeAspectScores(f.aspects),
    addedAt: safeString(f.addedAt, 40) || new Date().toISOString()
  };
}

// Rebuild an imported custom routine to a known shape. Title/desc are escaped at
// the sink, but the id is an attribute sink and the aspect must be a real key.
function sanitizeImportedCustomAction(a) {
  if (!a || typeof a !== "object") return null;
  const aspect = ASPECT_SCORE_KEYS.includes(a.aspect) ? a.aspect : null;
  if (!aspect) return null;
  const pts = Math.round(clampNumber((a.impacts || {})[aspect], 1, 15, 5));
  return {
    id: safeId(a.id, "custom"),
    title: safeString(a.title, 60).trim() || "Custom Routine",
    aspect,
    impacts: { [aspect]: pts },
    xp: Math.round(clampNumber(a.xp, 5, 50, 15)),
    desc: safeString(a.desc, 160)
  };
}

export class GameStateManager {
  constructor() {
    this.state = this.loadState();
    if (this.state.onboarded) {
      const questsChanged = this.resetPeriodicQuests();
      const snapshotTaken = this.maybeTakeSnapshot();
      if (questsChanged || snapshotTaken) {
        this.saveState();
      }
    }
  }

  // Merge parsed data over defaults so saves survive new same-schema fields.
  // Untrusted fields that reach innerHTML are coerced back to known shapes here
  // (see the sanitizers above) so an imported backup can't smuggle in markup.
  mergeSavedState(parsed) {
    const defaults = structuredClone(DEFAULT_STATE);

    // Coerce the profile fields the UI prints unescaped (name/level/xp) and
    // derive rank from level so it is always a known enum, never trusted input.
    const profile = { ...defaults.profile, ...(parsed.profile || {}) };
    profile.name = safeString(profile.name, 60).trim() || "Guest";
    profile.level = Math.round(clampNumber(profile.level, 1, 999, 1));
    profile.xp = Math.round(clampNumber(profile.xp, 0, 100000000, 0));
    profile.rank = this.getRank(profile.level);

    return {
      ...defaults,
      ...parsed,
      profile,
      aspects: sanitizeAspectScores(parsed.aspects),
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
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

  exportState() {
    return JSON.stringify(this.state, null, 2);
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

  getRank(level) {
    if (level >= 56) return "Exemplary";
    if (level >= 46) return "Distinguished";
    if (level >= 36) return "Advanced";
    if (level >= 26) return "Proficient";
    if (level >= 16) return "Progressing";
    if (level >= 6) return "Developing";
    return "Foundational";
  }

  getRankClass(level) {
    if (level >= 36) return "S-Rank";
    if (level >= 26) return "A-Rank";
    if (level >= 16) return "B-Rank";
    if (level >= 6) return "C-Rank";
    return "D-Rank";
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
  submitCheckin(surveyData) {
    const p = this.state.profile;
    const b = this.state.baseline;
    if (!b) return null;

    const rawSum = answers => (answers || []).reduce((sum, val) => sum + parseInt(val || 0), 0);
    const sums = {
      who5: rawSum(surveyData.who5),
      st5: rawSum(surveyData.st5),
      ucla: rawSum(surveyData.ucla),
      gse: rawSum(surveyData.gse),
      ras: p.relationshipStatus === "Single" ? null : rawSum(surveyData.ras)
    };
    const since = this.lastCalibrationDate();

    // Survey-derived targets, mirroring the onboarding formulas but computed
    // from raw sums. LSNS, grit, and learning reuse their stored values.
    const stressFactor = st5 =>
      st5 <= 4 ? 100 - st5 * 10 : st5 <= 7 ? 60 - (st5 - 4) * 10 : st5 <= 9 ? 30 - (st5 - 7) * 10 : 0;
    const socialNetwork = (b.lsns / 30) * 100;
    const lowLoneliness = 100 - ((sums.ucla - 3) / 6) * 100;
    const efficacy = ((sums.gse - 6) / 18) * 100;
    const grit = ((b.grit - 4) / 16) * 100;
    const study = Math.min(100, (parseFloat(p.weeklyLearningHours || 0) / 5) * 100);
    const digital = Math.min(100, Math.max(0, parseFloat(p.digitalLiteracy || 0)));

    const targets = {
      mental: 0.5 * (sums.who5 * 4) + 0.5 * stressFactor(sums.st5),
      relationships: p.relationshipStatus === "Single" || sums.ras === null
        ? 0.5 * socialNetwork + 0.5 * lowLoneliness
        : 0.4 * socialNetwork + 0.3 * lowLoneliness + 0.3 * (((sums.ras - 3) / 12) * 100),
      personalGoals: 0.4 * efficacy + 0.3 * grit + 0.3 * (0.5 * study + 0.5 * digital)
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

    const rawSum = answers => (answers || []).reduce((sum, val) => sum + parseInt(val || 0), 0);
    const deep = { ...(b.deep || {}) };
    const deepAnswered = { ...(b.deepAnswered || {}) };
    for (const [key, arr] of Object.entries(deepData)) {
      if (!Array.isArray(arr)) continue;
      deep[key] = rawSum(arr);
      deepAnswered[key] = true;
    }
    const deepDone = { ...(b.deepDone || {}), [aspectKey]: true };
    this.state.baseline = { ...b, deep, deepAnswered, deepDone };

    const newScore = this.deepAspectScore(aspectKey);
    if (newScore !== null) this.state.aspects[aspectKey] = newScore;

    this.addXP(DEEP_ASSESSMENT_XP);
    this.saveState();
    return { score: this.state.aspects[aspectKey] };
  }

  // Recompute one aspect from the deep instruments. Uses delta/blend forms that
  // adjust the CURRENT score by the change the fuller instrument implies, so any
  // logged drift or check-in shift is preserved. Returns null if the aspect's
  // deep instruments aren't captured yet.
  deepAspectScore(aspectKey) {
    const p = this.state.profile;
    const b = this.state.baseline;
    const d = (b && b.deep) || null;
    if (!d) return null;
    const base = this.state.aspects[aspectKey];
    const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
    const has = k => Number.isFinite(d[k]);
    const num = x => Number(x) || 0;

    switch (aspectKey) {
      case "finance": {
        // Swap CFPB-5 for CFPB-10 in the 0.4-weighted well-being term.
        if (!has("cfpb10")) return null;
        const shortN = (num(b.cfpb) / 20) * 100;
        const deepN = (d.cfpb10 / 40) * 100;
        return clamp(base + 0.4 * (deepN - shortN));
      }
      case "physical": {
        // Blend in sedentary/sleep-hygiene self-report at 15%.
        if (!has("sedentary")) return null;
        return clamp(0.85 * base + 0.15 * ((d.sedentary / 12) * 100));
      }
      case "mental": {
        // Average the PSS-10 stress reading into the ST-5 stress half.
        if (!has("pss10")) return null;
        const st5f = stressResilienceFromSt5(num(b.st5));
        const pssResilience = 100 - (d.pss10 / 40) * 100;
        return clamp(base + 0.25 * (pssResilience - st5f));
      }
      case "relationships": {
        // Swap LSNS-6 for LSNS-R, and (coupled) RAS-3 for RAS-7.
        let score = base;
        if (has("lsnsR")) {
          const shortN = (num(b.lsns) / 30) * 100;
          const deepN = (d.lsnsR / 60) * 100;
          const w = p.relationshipStatus === "Single" ? 0.5 : 0.4;
          score += w * (deepN - shortN);
        }
        if (has("ras7") && p.relationshipStatus !== "Single" && Number.isFinite(b.ras)) {
          const shortN = ((num(b.ras) - 3) / 12) * 100;
          const deepN = ((d.ras7 - 7) / 28) * 100;
          score += 0.3 * (deepN - shortN);
        }
        return clamp(score);
      }
      case "personalGoals": {
        // Swap GSE-6->GSE-10 (w=0.4) and Grit-S->Grit-12 (w=0.3), then blend in
        // Rosenberg self-esteem at 15%.
        let score = base;
        if (has("gse10")) score += 0.4 * (((d.gse10 - 10) / 30) * 100 - ((num(b.gse) - 6) / 18) * 100);
        if (has("grit12")) score += 0.3 * (((d.grit12 - 12) / 48) * 100 - ((num(b.grit) - 4) / 16) * 100);
        if (has("rses")) score = 0.85 * score + 0.15 * ((d.rses / 30) * 100);
        return clamp(score);
      }
      case "socialContribution": {
        if (!has("civicplus")) return null;
        return clamp(0.8 * base + 0.2 * ((d.civicplus / 16) * 100));
      }
      case "environment": {
        if (!has("greenplus")) return null;
        return clamp(0.8 * base + 0.2 * ((d.greenplus / 16) * 100));
      }
      case "humanityFuture": {
        // Blend in Consideration of Future Consequences at 20%.
        if (!has("cfc12")) return null;
        return clamp(0.8 * base + 0.2 * (((d.cfc12 - 12) / 48) * 100));
      }
      default:
        return null;
    }
  }

  // --- SCIENTIFIC ASPECT SCORING CALCULATIONS ---

  calculateFinanceScore(profile, cfpbAnswers) {
    // 1. Subjective CFPB Well-Being Score (5 items, each 0-4, raw 0-20)
    const rawCfpb = cfpbAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const S_wellbeing = rawCfpb * 5; // standardize to 0-100

    // 2. Objective NSO Thailand Income Percentile
    const inc = parseFloat(profile.income || 0);
    const reg = profile.region;
    let S_income = 0;

    if (reg === "Bangkok") {
      // Bangkok-adjusted distribution thresholds (approx 45% higher)
      if (inc <= 13000) S_income = (inc / 13000) * 20;
      else if (inc <= 22000) S_income = 20 + ((inc - 13000) / 9000) * 20;
      else if (inc <= 55000) S_income = 40 + ((inc - 22000) / 33000) * 40;
      else if (inc <= 90000) S_income = 80 + ((inc - 55000) / 35000) * 15;
      else S_income = 95 + Math.min(5, ((inc - 90000) / 20000) * 5);
    } else {
      // Provinces thresholds
      if (inc <= 9500) S_income = (inc / 9500) * 20;
      else if (inc <= 15700) S_income = 20 + ((inc - 9500) / 6200) * 20;
      else if (inc <= 38000) S_income = 40 + ((inc - 15700) / 22300) * 40;
      else if (inc <= 65000) S_income = 80 + ((inc - 38000) / 27000) * 15;
      else S_income = 95 + Math.min(5, ((inc - 65000) / 15000) * 5);
    }

    // Savings rate modifier (max 10 bonus points)
    const savRate = parseFloat(profile.savingsRate || 0);
    const savingsBonus = Math.min(10, (savRate / 20) * 10);

    return Math.round(Math.min(100, (0.6 * S_income) + (0.4 * S_wellbeing) + savingsBonus));
  }

  calculatePhysicalScore(profile, jssAnswers) {
    // 1. IPAQ MET-minutes
    const vigDays = parseInt(profile.weeklyVigorousDays || 0);
    const vigMins = parseInt(profile.weeklyVigorousMins || 0);
    const modDays = parseInt(profile.weeklyModerateDays || 0);
    const modMins = parseInt(profile.weeklyModerateMins || 0);
    const walkDays = parseInt(profile.weeklyWalkingDays || 0);
    const walkMins = parseInt(profile.weeklyWalkingMins || 0);

    const totalMET = (8.0 * vigDays * vigMins) + (4.0 * modDays * modMins) + (3.3 * walkDays * walkMins);

    let S_activity = 0;
    if (totalMET < 600) {
      S_activity = (totalMET / 600) * 40;
    } else if (totalMET <= 3000) {
      S_activity = 40 + ((totalMET - 600) / 2400) * 40;
    } else {
      S_activity = 80 + Math.min(20, ((totalMET - 3000) / 3000) * 20);
    }

    // 2. Asian BMI Standard — OMITTED (not faked at 50) when weight/height are
    // missing. A fabricated "average" silently inflates or deflates the score;
    // instead its 0.2 weight is redistributed across the measured components.
    const w = parseFloat(profile.weight || 0);
    const h = parseFloat(profile.height || 0) / 100; // in meters
    let S_bmi = null;
    if (w > 0 && h > 0) {
      const bmi = w / (h * h);
      if (bmi >= 18.5 && bmi <= 22.9) S_bmi = 100; // Ideal
      else if (bmi >= 23.0 && bmi <= 24.9) S_bmi = 75; // Overweight
      else if (bmi >= 25.0 && bmi <= 29.9) S_bmi = 50; // Obese Class 1
      else if (bmi >= 30.0) S_bmi = 25; // Obese Class 2
      else S_bmi = Math.round(Math.max(25, (bmi / 18.5) * 100)); // Underweight
    }

    // 3. Sleep quality (4 items, each 0-5, raw 0-20)
    const rawJss = jssAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const F_quality = 100 - (rawJss * 5); // 0 raw -> 100 pts, 20 raw -> 0 pts

    // Duration folds in only when reported. A genuinely short night (< 6h) still
    // scores low, but an ABSENT duration no longer fabricates a floor of 50 —
    // sleep then reflects the measured quality alone.
    const duration = parseFloat(profile.sleepHours || 0);
    let S_sleep;
    if (duration > 0) {
      const F_duration = duration >= 7 && duration <= 9 ? 100 : (duration >= 6 && duration < 7 ? 75 : 50);
      S_sleep = (0.5 * F_duration) + (0.5 * F_quality);
    } else {
      S_sleep = F_quality;
    }

    // 4. Nutrition
    const portions = parseFloat(profile.vegetablePortions || 0);
    const F_veg = Math.min(100, (portions / 5) * 100);
    const liters = parseFloat(profile.waterLiters || 0);
    const F_water = Math.min(100, (liters / 2.5) * 100);
    const S_nutrition = (0.5 * F_veg) + (0.5 * F_water);

    // Weighted aggregate. A null component (BMI without measurements) drops out
    // and the surviving weights are renormalized, so nothing is ever imputed.
    const parts = [
      [0.4, S_activity],
      [0.2, S_bmi],
      [0.2, S_sleep],
      [0.2, S_nutrition]
    ].filter(([, value]) => value !== null);
    const totalWeight = parts.reduce((sum, [weight]) => sum + weight, 0);
    const weighted = parts.reduce((sum, [weight, value]) => sum + (weight * value), 0);
    return Math.round(weighted / totalWeight);
  }

  calculateMentalScore(profile, st5Answers, who5Answers) {
    // 1. DMH Thailand ST-5 Stress Test (5 items, each 0-3, raw 0-15)
    const rawSt5 = st5Answers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    let S_stress_factor = 0;
    if (rawSt5 <= 4) {
      S_stress_factor = 100 - (rawSt5 * 10);
    } else if (rawSt5 <= 7) {
      S_stress_factor = 60 - ((rawSt5 - 4) * 10);
    } else if (rawSt5 <= 9) {
      S_stress_factor = 30 - ((rawSt5 - 7) * 10);
    } else {
      S_stress_factor = 0;
    }

    // 2. WHO-5 Index (5 items, each 0-5, raw 0-25)
    const rawWho5 = who5Answers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const S_wellbeing = rawWho5 * 4; // 0-100

    return Math.round((0.5 * S_wellbeing) + (0.5 * S_stress_factor));
  }

  calculateRelationshipsScore(profile, lsnsAnswers, uclaAnswers, rasAnswers) {
    // 1. LSNS-6 Social Support (6 items, each 0-5, raw 0-30)
    const rawLsns = lsnsAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const S_social_network = (rawLsns / 30) * 100;

    // 2. UCLA Loneliness (3 items, each 1-3, raw 3-9)
    const rawUcla = uclaAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const S_loneliness = 100 - (((rawUcla - 3) / 6) * 100);

    // 3. Romantic Satisfaction (RAS 3 items, each 1-5, raw 3-15)
    let S_romantic = 0;
    if (profile.relationshipStatus !== "Single" && rasAnswers) {
      const rawRas = rasAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
      S_romantic = ((rawRas - 3) / 12) * 100;
    }

    if (profile.relationshipStatus === "Single") {
      return Math.round((0.5 * S_social_network) + (0.5 * S_loneliness));
    }
    return Math.round((0.4 * S_social_network) + (0.3 * S_loneliness) + (0.3 * S_romantic));
  }

  calculatePersonalGoalsScore(profile, gseAnswers, gritAnswers) {
    // 1. GSE-6 Self-Efficacy (6 items, each 1-4, raw 6-24)
    const rawGse = gseAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const S_self_efficacy = ((rawGse - 6) / 18) * 100;

    // 2. Grit-S (4 items, each 1-5, raw 4-20)
    const rawGrit = gritAnswers.reduce((sum, val) => sum + parseInt(val || 0), 0);
    const S_grit = ((rawGrit - 4) / 16) * 100;

    // 3. Active Learning habits
    // NOTE: `weeklyLearningHours` is intentionally shared with
    // calculateHumanityFutureScore's S_skills — learning time counts toward both
    // personal growth and future-proofing. Deliberate reuse, not a bug.
    const hours = parseFloat(profile.weeklyLearningHours || 0);
    const F_study = Math.min(100, (hours / 5) * 100);
    const F_digital = Math.min(100, Math.max(0, parseFloat(profile.digitalLiteracy || 0)));
    const S_learning = (0.5 * F_study) + (0.5 * F_digital);

    return Math.round((0.4 * S_self_efficacy) + (0.3 * S_grit) + (0.3 * S_learning));
  }

  calculateSocialContributionScore(profile, ptmAnswers) {
    // PTM Behavior (5 items, each 0-4)
    const qValues = ptmAnswers.map(v => parseInt(v || 0));

    // Donation Score
    const donRate = parseFloat(profile.monthlyDonations || 0);
    const donIncRatio = profile.income > 0 ? (donRate / profile.income) * 100 : 0;
    const volumeFactor = donIncRatio >= 2 || donRate >= 500 ? 100 : Math.min(100, (donRate / 500) * 100);
    const frequencyFactor = qValues[0] * 25; // max 100
    const S_donation = (0.5 * frequencyFactor) + (0.5 * volumeFactor);

    // Volunteering & Prosocial. Both PTM helping items count toward prosocial
    // behavior: Q2 "help friends/family in need" (previously collected but never
    // scored) and Q3 "help strangers".
    const volHours = parseFloat(profile.volunteeringHours || 0);
    const volunteerFactor = Math.min(100, (volHours / 4) * 100);
    const prosocialFactor = ((qValues[1] + qValues[2]) / 8) * 100; // Q2 + Q3
    const S_action = (0.6 * volunteerFactor) + (0.4 * prosocialFactor);

    // Civic & Local (Q4 & Q5)
    const S_civic = ((qValues[3] + qValues[4]) / 8) * 100;

    return Math.round((0.4 * S_donation) + (0.4 * S_action) + (0.2 * S_civic));
  }

  calculateEnvironmentScore(profile, gebAnswers) {
    // GEB Scale (6 items, each 0-4)
    const qValues = gebAnswers.map(v => parseInt(v || 0));

    // Waste and Plastics
    const plastics = parseInt(profile.singleUsePlastics || 0);
    let plasticFactor = 0;
    if (plastics === 0) plasticFactor = 100;
    else if (plastics <= 2) plasticFactor = 80;
    else if (plastics <= 5) plasticFactor = 50;
    else if (plastics <= 7) plasticFactor = 25;

    // Waste: plastic footprint + recycling (Q1) + single-use avoidance (Q2).
    // Q2 was previously collected but never scored.
    const S_waste = (0.5 * plasticFactor) + (0.25 * (qValues[0] * 25)) + (0.25 * (qValues[1] * 25));

    // Transit (GEB Q3: public transit / walk / cycle frequency)
    const S_transit = qValues[2] * 25;

    // Conservation: energy habits (Q4 & Q5) + eco-product choices (Q6). Q6 was
    // previously collected but never scored.
    const S_conservation = ((qValues[3] + qValues[4] + qValues[5]) / 12) * 100;

    return Math.round((0.4 * S_waste) + (0.4 * S_transit) + (0.2 * S_conservation));
  }

  calculateHumanityFutureScore(profile, lfisAnswers) {
    // LFIS (5 items, each 0-4)
    const qValues = lfisAnswers.map(v => parseInt(v || 0));

    // Future Skills
    // NOTE: `weeklyLearningHours` is intentionally shared with
    // calculatePersonalGoalsScore's S_learning (see note there). The UI surfaces
    // the reuse on the "Future skills" component detail line.
    const hours = parseFloat(profile.weeklyLearningHours || 0);
    const studyHours = Math.min(100, (hours / 4) * 100);
    const Q1_val = qValues[0] * 25;
    const S_skills = (0.5 * studyHours) + (0.5 * Q1_val);

    // Legacy (Q2)
    const S_legacy = qValues[1] * 25;

    // Risk / Philanthropy (Q3 & Q5)
    const S_philanthropy = ((qValues[2] + qValues[4]) / 8) * 100;

    // Security (Q4 & Pension)
    const pensionVal = profile.longTermInvestments ? 100 : 0;
    const Q4_val = qValues[3] * 25;
    const S_security = (0.5 * pensionVal) + (0.5 * Q4_val);

    return Math.round((0.25 * S_skills) + (0.25 * S_legacy) + (0.25 * S_philanthropy) + (0.25 * S_security));
  }

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
    const rawSum = answers => (answers || []).reduce((sum, val) => sum + parseInt(val || 0), 0);
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

    const aspects = this.state.aspects;
    aspects.finance = this.calculateFinanceScore(p, surveyData.cfpb);
    aspects.physical = this.calculatePhysicalScore(p, surveyData.jss);
    aspects.mental = this.calculateMentalScore(p, surveyData.st5, surveyData.who5);
    aspects.relationships = this.calculateRelationshipsScore(p, surveyData.lsns, surveyData.ucla, surveyData.ras);
    aspects.personalGoals = this.calculatePersonalGoalsScore(p, surveyData.gse, surveyData.grit);
    aspects.socialContribution = this.calculateSocialContributionScore(p, surveyData.ptm);
    aspects.environment = this.calculateEnvironmentScore(p, surveyData.geb);
    aspects.humanityFuture = this.calculateHumanityFutureScore(p, surveyData.lfis);

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
    this.state.goals = [
      {
        id: "daily_water",
        title: "Stay Hydrated",
        description: "Log your 2L+ hydration once today.",
        aspect: "physical",
        type: "daily",
        actionIds: ["drink_water"],
        targetValue: 1,
        currentValue: 0,
        xpReward: 15,
        completed: false
      },
      {
        id: "daily_sigh",
        title: "Breath Control",
        description: "Log 3 physiological sighs to reset stress.",
        aspect: "mental",
        type: "daily",
        actionIds: ["phys_sigh"],
        targetValue: 3,
        currentValue: 0,
        xpReward: 10,
        completed: false
      },
      {
        id: "weekly_workout",
        title: "Active Core",
        description: "Log at least 3 exercise sessions this week.",
        aspect: "physical",
        type: "weekly",
        actionIds: ["workout"],
        targetValue: 3,
        currentValue: 0,
        xpReward: 50,
        completed: false
      },
      {
        id: "epic_savings",
        title: "Safety Deposit",
        description: "Log a savings deposit 10 times.",
        aspect: "finance",
        type: "epic",
        actionIds: ["save_money"],
        targetValue: 10,
        currentValue: 0,
        xpReward: 150,
        completed: false,
        milestones: [
          { text: "3 deposits logged", at: 3, completed: false },
          { text: "6 deposits logged", at: 6, completed: false },
          { text: "10 deposits logged", at: 10, completed: false }
        ]
      }
    ];
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

export const stateManager = new GameStateManager();
