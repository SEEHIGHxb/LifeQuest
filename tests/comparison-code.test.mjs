// Tests for Comparison Codes (v2 shareable snapshots) and the participant roster.
//
// A v2 code carries only a name and the eight aspect scores — no age/level, no
// points. The board ranks on the Balance Index derived from those scores. These
// tests pin: the v2 round-trip; that no age/points field survives encoding OR
// decoding (the privacy point of the rewrite); that legacy v1 codes still decode
// with their l/p ignored; hostile-payload rejection; and that ordering by
// Balance Index rewards balance over a high-but-spiky profile.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { encodeComparisonCode, decodeComparisonCode } from "../comparison-code.js";
import { balanceIndex } from "../grades.js";
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
    profile: { name: "Stelle", ...(overrides.profile || {}) },
    aspects: {
      finance: 55, physical: 88, mental: 87, relationships: 77,
      personalGoals: 71, socialContribution: 45, environment: 50, humanityFuture: 35,
      ...(overrides.aspects || {})
    }
  };
}

// A base64url "LQ1-" code carrying an arbitrary payload — for forging codes the
// encoder would never emit (legacy formats, hostile inputs).
const forge = payload => "LQ1-" + Buffer.from(JSON.stringify(payload)).toString("base64url");
const decodePayload = code => JSON.parse(Buffer.from(code.slice(4), "base64url").toString());

test("a v2 code round-trips the name and the eight aspects", () => {
  const state = makeState();
  const code = encodeComparisonCode(state);
  assert.ok(code.startsWith("LQ1-"), "codes carry the LQ1 prefix");
  const decoded = decodeComparisonCode(code);
  assert.equal(decoded.name, "Stelle");
  assert.equal(decoded.aspects.physical, 88);
  assert.equal(decoded.aspects.humanityFuture, 35);
  assert.equal(Object.keys(decoded.aspects).length, 8);
});

test("a v2 code carries no age/level and no points, on the wire or when decoded", () => {
  // The whole reason for v2: level now means age, so a shared code must not
  // disclose it, and tenure-confounded points are gone too.
  const payload = decodePayload(encodeComparisonCode(makeState()));
  assert.equal(payload.v, 2);
  assert.equal(payload.l, undefined, "the encoded payload has no l (level)");
  assert.equal(payload.p, undefined, "the encoded payload has no p (points)");
  const decoded = decodeComparisonCode(encodeComparisonCode(makeState()));
  assert.equal(decoded.level, undefined, "no level/age field on a decoded code");
  assert.equal(decoded.totalPoints, undefined, "no points field on a decoded code");
});

test("non-Latin participant names survive the base64url round-trip", () => {
  const code = encodeComparisonCode(makeState({ profile: { name: "โจโจ้" } }));
  assert.equal(decodeComparisonCode(code).name, "โจโจ้");
});

test("names are trimmed and clamped to 20 characters", () => {
  const code = encodeComparisonCode(makeState({ profile: { name: "  " + "x".repeat(40) } }));
  assert.equal(decodeComparisonCode(code).name.length, 20);
});

// A code shared before this release is v1 (it also packed l:level and p:points).
// It must still decode — the l/p are read past and left out of the result.
test("a legacy v1 code still decodes, dropping its level and points", () => {
  const legacy = forge({ v: 1, n: "Legacy", l: 42, p: 9000, a: [55, 88, 87, 77, 71, 45, 50, 35] });
  const decoded = decodeComparisonCode(legacy);
  assert.equal(decoded.name, "Legacy");
  assert.equal(decoded.aspects.finance, 55);
  assert.equal(decoded.aspects.humanityFuture, 35);
  assert.equal(decoded.level, undefined, "v1's level is not carried through");
  assert.equal(decoded.totalPoints, undefined, "v1's points are not carried through");
});

test("decodeComparisonCode rejects malformed, tampered, and unsupported codes", () => {
  assert.throws(() => decodeComparisonCode("hello"), /start with "LQ1-"/);
  assert.throws(() => decodeComparisonCode("LQ1-%%%not-base64%%%"), /damaged/);
  assert.throws(() => decodeComparisonCode(""), /start with/);

  // A version that is neither 1 nor 2 is refused.
  assert.throws(() => decodeComparisonCode(forge({ v: 3, n: "X", a: Array(8).fill(50) })), /version/);
  // Missing name / malformed aspect arrays.
  assert.throws(() => decodeComparisonCode(forge({ v: 2, n: "", a: Array(8).fill(50) })), /name/);
  assert.throws(() => decodeComparisonCode(forge({ v: 2, n: "X", a: [50, 50] })), /aspect/);
  assert.throws(() => decodeComparisonCode(forge({ v: 2, n: "X", a: Array(8).fill(999) })), /aspect/);
});

// --- BOARD ORDERING (the Balance Index is the only ranking key) ---

test("ranking by Balance Index rewards balance over a high-but-spiky profile", () => {
  // Balanced: all 70. Spiky: seven 85s and one 10 — a HIGHER arithmetic mean,
  // but the collapsed aspect drags its harmonic mean far below. The board must
  // put the balanced profile first, proving it ranks on balance, not average.
  const balanced = decodeComparisonCode(encodeComparisonCode(makeState({
    aspects: { finance: 70, physical: 70, mental: 70, relationships: 70, personalGoals: 70, socialContribution: 70, environment: 70, humanityFuture: 70 }
  })));
  const spiky = decodeComparisonCode(encodeComparisonCode(makeState({
    aspects: { finance: 85, physical: 85, mental: 85, relationships: 85, personalGoals: 85, socialContribution: 85, environment: 85, humanityFuture: 10 }
  })));
  assert.ok(balanceIndex(spiky.aspects) < balanceIndex(balanced.aspects),
    "the spiky profile's Balance Index is lower despite a higher average");
  const ranked = [spiky, balanced].sort((a, b) => balanceIndex(b.aspects) - balanceIndex(a.aspects));
  assert.equal(ranked[0], balanced, "the balanced profile ranks first");
});

test("addFriend stores decoded participants and survives reload", () => {
  const m = new GameStateManager();
  const friend = decodeComparisonCode(encodeComparisonCode(makeState()));
  const result = m.addFriend(friend);
  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.match(result.friend.id, /^crew_/);

  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.friends.length, 1);
  assert.equal(reloaded.state.friends[0].name, "Stelle");
  assert.equal(reloaded.state.friends[0].aspects.physical, 88, "the aspect scores survive the reload");
  assert.equal(reloaded.state.friends[0].level, undefined, "no age/level is stored for a participant");
});

test("re-adding the same name updates in place instead of duplicating", () => {
  const m = new GameStateManager();
  m.addFriend(decodeComparisonCode(encodeComparisonCode(makeState())));
  const newer = decodeComparisonCode(encodeComparisonCode(makeState({
    profile: { name: "stelle" }, aspects: { finance: 90 }
  })));
  const result = m.addFriend(newer);
  assert.equal(result.updated, true, "case-insensitive name match updates in place");
  assert.equal(m.state.friends.length, 1);
  assert.equal(m.state.friends[0].aspects.finance, 90, "the newer aspects replace the older");
});

test("removeFriend deletes by id and the roster caps at 50", () => {
  const m = new GameStateManager();
  const { friend } = m.addFriend(decodeComparisonCode(encodeComparisonCode(makeState())));
  m.removeFriend(friend.id);
  assert.equal(m.state.friends.length, 0);

  for (let i = 0; i < 50; i++) {
    assert.equal(m.addFriend({ name: `Crew ${i}`, aspects: {} }).ok, true);
  }
  const overflow = m.addFriend({ name: "One Too Many", aspects: {} });
  assert.equal(overflow.ok, false);
  assert.match(overflow.reason, /full/i);
});
