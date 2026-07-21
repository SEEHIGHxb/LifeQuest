// Tests for Crew Codes (shareable rankings) and the friends roster (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { encodeCrewCode, decodeCrewCode, crewPoints } from "../crewcode.js";
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

function makeState(overrides = {}) {
  return {
    profile: { name: "Stelle", level: 7, ...(overrides.profile || {}) },
    aspects: {
      finance: 55, physical: 88, mental: 87, relationships: 77,
      personalGoals: 71, socialContribution: 45, environment: 50, humanityFuture: 35,
      ...(overrides.aspects || {})
    },
    history: overrides.history || [{ xpReward: 30 }, { xpReward: 20 }]
  };
}

test("crewPoints matches the rankings formula (history XP + level * 150)", () => {
  assert.equal(crewPoints(makeState()), 50 + 7 * 150);
  assert.equal(crewPoints(makeState({ history: [] })), 7 * 150);
});

test("crew codes round-trip name, level, points, and aspects", () => {
  const state = makeState();
  const code = encodeCrewCode(state);
  assert.ok(code.startsWith("LQ1-"), "codes carry the LQ1 prefix");
  const decoded = decodeCrewCode(code);
  assert.equal(decoded.name, "Stelle");
  assert.equal(decoded.level, 7);
  assert.equal(decoded.totalPoints, crewPoints(state));
  assert.equal(decoded.aspects.physical, 88);
  assert.equal(decoded.aspects.humanityFuture, 35);
  assert.equal(Object.keys(decoded.aspects).length, 8);
});

test("non-Latin crew names survive the base64url round-trip", () => {
  const code = encodeCrewCode(makeState({ profile: { name: "โจโจ้", level: 3 } }));
  assert.equal(decodeCrewCode(code).name, "โจโจ้");
});

test("names are trimmed and clamped to 20 characters", () => {
  const code = encodeCrewCode(makeState({ profile: { name: "  " + "x".repeat(40), level: 1 } }));
  assert.equal(decodeCrewCode(code).name.length, 20);
});

test("decodeCrewCode rejects malformed and tampered codes", () => {
  assert.throws(() => decodeCrewCode("hello"), /start with "LQ1-"/);
  assert.throws(() => decodeCrewCode("LQ1-%%%not-base64%%%"), /damaged/);
  assert.throws(() => decodeCrewCode(""), /start with/);

  // Valid base64 but hostile payloads
  const forge = payload => "LQ1-" + Buffer.from(JSON.stringify(payload)).toString("base64url");
  assert.throws(() => decodeCrewCode(forge({ v: 2, n: "X", l: 1, p: 0, a: Array(8).fill(50) })), /version/);
  assert.throws(() => decodeCrewCode(forge({ v: 1, n: "", l: 1, p: 0, a: Array(8).fill(50) })), /name/);
  assert.throws(() => decodeCrewCode(forge({ v: 1, n: "X", l: 0, p: 0, a: Array(8).fill(50) })), /level/);
  assert.throws(() => decodeCrewCode(forge({ v: 1, n: "X", l: 1, p: 99999999999, a: Array(8).fill(50) })), /points/);
  assert.throws(() => decodeCrewCode(forge({ v: 1, n: "X", l: 1, p: 0, a: [50, 50] })), /aspect/);
  assert.throws(() => decodeCrewCode(forge({ v: 1, n: "X", l: 1, p: 0, a: Array(8).fill(999) })), /aspect/);
});

test("addFriend stores decoded crewmates and survives reload", () => {
  const m = new GameStateManager();
  const friend = decodeCrewCode(encodeCrewCode(makeState()));
  const result = m.addFriend(friend);
  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.match(result.friend.id, /^crew_/);

  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.friends.length, 1);
  assert.equal(reloaded.state.friends[0].name, "Stelle");
});

test("re-adding the same name updates instead of duplicating", () => {
  const m = new GameStateManager();
  m.addFriend(decodeCrewCode(encodeCrewCode(makeState())));
  const newer = decodeCrewCode(encodeCrewCode(makeState({ profile: { name: "stelle", level: 9 } })));
  const result = m.addFriend(newer);
  assert.equal(result.updated, true, "case-insensitive name match updates in place");
  assert.equal(m.state.friends.length, 1);
  assert.equal(m.state.friends[0].level, 9);
});

test("removeFriend deletes by id and the roster caps at 50", () => {
  const m = new GameStateManager();
  const { friend } = m.addFriend(decodeCrewCode(encodeCrewCode(makeState())));
  m.removeFriend(friend.id);
  assert.equal(m.state.friends.length, 0);

  for (let i = 0; i < 50; i++) {
    assert.equal(m.addFriend({ name: `Crew ${i}`, level: 1, totalPoints: 150, aspects: {} }).ok, true);
  }
  const overflow = m.addFriend({ name: "One Too Many", level: 1, totalPoints: 150, aspects: {} });
  assert.equal(overflow.ok, false);
  assert.match(overflow.reason, /full/i);
});

test("crewPoints prefers lifetime XP over the capped history (#11)", () => {
  // With a lifetime counter, points reflect the true total, not the (capped)
  // action history — quest/check-in/deep XP that never hit history now count.
  const withLifetime = makeState({ profile: { lifetimeXp: 5000 }, history: [{ xpReward: 30 }] });
  assert.equal(crewPoints(withLifetime), 5000 + 7 * 150);
  // Saves predating the counter fall back to the history sum.
  const legacy = makeState({ history: [{ xpReward: 30 }, { xpReward: 20 }] });
  assert.equal(crewPoints(legacy), 50 + 7 * 150);
});

test("addXP accumulates lifetimeXp; old saves backfill from level + xp (#11)", () => {
  const m = new GameStateManager();
  const before = m.state.profile.lifetimeXp;
  m.addXP(40);
  m.addXP(60);
  assert.equal(m.state.profile.lifetimeXp, before + 100, "every award adds to the lifetime counter");

  // The backfill moved into migrateV4State, where the pre-v5 EARNED level is
  // still readable — after migration `level` means age, and the same formula
  // would read a birthday count as an XP ladder. Load through the real chain
  // (as loadState does) rather than calling mergeSavedState directly, so this
  // test can still catch that ordering breaking.
  const load = raw => {
    localStorage.setItem("lifequest_state", JSON.stringify(raw));
    return new GameStateManager().state;
  };
  // Legacy save without the counter -> reconstruct from the earned level (each
  // i costs i*100 to clear) + current xp: 100*(4*5)/2 + 30 = 1030.
  const migrated = load({ schemaVersion: 4, profile: { name: "Old", level: 5, xp: 30, age: 34 } });
  assert.equal(migrated.profile.lifetimeXp, 1030, "backfilled from the earned level, not from the age");
  assert.equal(migrated.profile.level, 34, "level becomes the age");
  // A genuine counter already on the save is preserved untouched.
  const kept = load({ schemaVersion: 4, profile: { name: "New", level: 5, xp: 30, lifetimeXp: 9999, age: 34 } });
  assert.equal(kept.profile.lifetimeXp, 9999);
  assert.equal(kept.profile.season.earnedXp, 30, "the old per-level xp opens the first season");
});
