// Tests for Phase 4 personalization: weekly commitments and the monthly
// mini re-assessment recalibration (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";

function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => installMockStorage());

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

const BASELINE = {
  date: daysAgo(30),
  cfpb: 10, jss: 4, st5: 3, who5: 17, lsns: 17, ucla: 4,
  ras: null, gse: 18, grit: 14, ptm: 10, geb: 12, lfis: 10
};

function calibratedManager(overrides = {}) {
  const m = new GameStateManager();
  m.state.onboarded = true;
  m.state.baseline = { ...BASELINE, ...(overrides.baseline || {}) };
  m.state.profile = { ...m.state.profile, ...(overrides.profile || {}) };
  m.state.aspects = { ...m.state.aspects, ...(overrides.aspects || {}) };
  return m;
}

// --- COMMITMENT MODE ---

test("commitToAspect clamps the weekly target to 3-21", () => {
  const m = new GameStateManager();
  assert.equal(m.commitToAspect("physical", 1).weeklyTarget, 3);
  assert.equal(m.commitToAspect("physical", 99).weeklyTarget, 21);
  assert.equal(m.commitToAspect("physical", 5).weeklyTarget, 5);
  assert.equal(m.state.commitment.progress, 0);
  assert.equal(m.state.commitment.completed, false);
  assert.equal(m.commitToAspect("notAnAspect", 5), null, "unknown aspects are rejected");
});

test("commitment progresses only from logs that positively move its aspect", () => {
  const m = new GameStateManager();
  m.commitToAspect("physical", 5);
  m.logAction("workout", "Workout", { physical: 10, mental: 3 }, 0);
  m.logAction("save_money", "Save", { finance: 8 }, 0);
  m.logAction("make_merit", "Merit", { socialContribution: 10, physical: -2 }, 0);
  assert.equal(m.state.commitment.progress, 1, "only the physical-positive log counts");
});

test("hitting the weekly target awards the bonus XP exactly once", () => {
  const m = new GameStateManager();
  m.commitToAspect("physical", 3); // bonus = 30 + 3*10 = 60
  for (let i = 0; i < 3; i++) m.logAction("workout", "Workout", { physical: 5 }, 0);
  assert.equal(m.state.commitment.completed, true);
  assert.equal(m.state.profile.xp, 60, "bonus XP granted on completion");
  m.logAction("workout", "Workout", { physical: 5 }, 0);
  assert.equal(m.state.profile.xp, 60, "no double bonus after completion");
  assert.equal(m.commitBonusXp(21), 150, "bonus caps at 150 XP");
});

test("commitments renew each ISO week with progress reset", () => {
  const m = new GameStateManager();
  m.commitToAspect("mental", 4);
  m.state.commitment.progress = 4;
  m.state.commitment.completed = true;
  m.state.questResets.weekly = "2020-W1"; // force a week rollover
  m.resetPeriodicQuests();
  assert.equal(m.state.commitment.progress, 0);
  assert.equal(m.state.commitment.completed, false);
  assert.equal(m.state.commitment.aspect, "mental", "pledged aspect persists across weeks");
});

test("clearCommitment removes the pledge and both fields survive a reload", () => {
  const m = new GameStateManager();
  m.commitToAspect("finance", 6);
  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.commitment.aspect, "finance", "commitment survives reload");
  assert.deepEqual(reloaded.state.checkins, []);
  m.clearCommitment();
  assert.equal(new GameStateManager().state.commitment, null);
});

// --- MONTHLY MINI RE-ASSESSMENT ---

test("isCheckinDue triggers 28 days after the last calibration", () => {
  const fresh = calibratedManager({ baseline: { date: daysAgo(1) } });
  assert.equal(fresh.isCheckinDue(), false, "not due right after onboarding");
  const stale = calibratedManager(); // baseline 30 days old
  assert.equal(stale.isCheckinDue(), true, "due after 28+ days");
  const notOnboarded = new GameStateManager();
  assert.equal(notOnboarded.isCheckinDue(), false);
});

test("submitCheckin caps shifts at ±15 in both directions", () => {
  const up = calibratedManager({ aspects: { mental: 10 } });
  const upShifts = up.submitCheckin({ who5: [5, 5, 5, 5, 5], st5: [0, 0, 0, 0, 0], ucla: [1, 1, 1], gse: [4, 4, 4, 4, 4, 4] });
  assert.equal(upShifts.mental, 15, "large improvement capped at +15");
  assert.equal(up.state.aspects.mental, 25);

  const down = calibratedManager({ aspects: { mental: 95 } });
  const downShifts = down.submitCheckin({ who5: [0, 0, 0, 0, 0], st5: [3, 3, 3, 3, 3], ucla: [3, 3, 3], gse: [1, 1, 1, 1, 1, 1] });
  assert.equal(downShifts.mental, -15, "large decline capped at -15");
  assert.equal(down.state.aspects.mental, 80);
});

test("consistent related logging adds a small capped bonus at re-sync", () => {
  // who5 [3x5] = 15 -> 60; st5 zeros -> 100 => mental target 80.
  const answers = { who5: [3, 3, 3, 3, 3], st5: [0, 0, 0, 0, 0], ucla: [1, 1, 1], gse: [3, 3, 3, 3, 3, 3] };
  const idle = calibratedManager({ aspects: { mental: 80 } });
  assert.equal(idle.submitCheckin(structuredClone(answers)).mental, 0, "at target with no logs: no shift");

  const active = calibratedManager({ aspects: { mental: 80 } });
  for (let i = 0; i < 20; i++) {
    active.state.history.push({ timestamp: new Date().toISOString(), impacts: { mental: 5 } });
  }
  assert.equal(active.submitCheckin(structuredClone(answers)).mental, 3, "activity bonus caps at +3");
});

test("submitCheckin refreshes stored sums, keeps the rest, and pays XP", () => {
  const m = calibratedManager();
  const shifts = m.submitCheckin({ who5: [4, 4, 4, 4, 4], st5: [1, 1, 1, 0, 0], ucla: [1, 1, 2], gse: [4, 4, 4, 3, 3, 3] });
  assert.equal(m.state.baseline.who5, 20, "WHO-5 sum refreshed");
  assert.equal(m.state.baseline.st5, 3);
  assert.equal(m.state.baseline.ucla, 4);
  assert.equal(m.state.baseline.gse, 21);
  assert.equal(m.state.baseline.lsns, 17, "LSNS not re-asked, kept from baseline");
  assert.equal(m.state.baseline.ras, null, "single users keep ras null");
  assert.equal(m.state.profile.xp, 40, "re-sync pays +40 XP");
  assert.equal(m.state.checkins.length, 1);
  assert.deepEqual(m.state.checkins[0].shifts, shifts);
  assert.equal(m.isCheckinDue(), false, "check-in date becomes the new calibration point");
});

test("coupled users recalibrate relationships with the fresh RAS reading", () => {
  const m = calibratedManager({
    profile: { relationshipStatus: "Coupled" },
    baseline: { ras: 12 },
    aspects: { relationships: 50 }
  });
  const shifts = m.submitCheckin({
    who5: [3, 3, 3, 3, 3], st5: [0, 0, 0, 0, 0], ucla: [1, 1, 1],
    ras: [5, 5, 5], gse: [3, 3, 3, 3, 3, 3]
  });
  // social 17/30 -> 56.7; loneliness 100; ras (15-3)/12 -> 100
  // target = 0.4*56.7 + 0.3*100 + 0.3*100 = 82.7 -> shift capped +15
  assert.equal(shifts.relationships, 15);
  assert.equal(m.state.baseline.ras, 15, "fresh RAS sum stored");
});
