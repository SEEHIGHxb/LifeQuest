// Behavioral tests for the level-year screen (#/year).
//
// tests/views-xss.test.mjs proves this view ESCAPES its inputs; its stub has a
// no-op addEventListener, so it structurally cannot reach the submit handler.
// This file covers the other half: what happens when the user actually answers
// the birthday question — the only path by which a real user ever levels up.
//
// Same minimal-stub approach as views-xss/methodology (no happy-dom), but with
// a per-id element registry so a submit can be dispatched and the resulting
// state inspected.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let elements;
let captured;

function installGlobals() {
  globalThis.localStorage = {
    store: {},
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
  elements = new Map();
  captured = { html: "", handlers: {} };
  globalThis.document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          id,
          value: "",
          textContent: "",
          classList: { add() {}, remove() {} },
          set innerHTML(v) { captured.html = v; },
          get innerHTML() { return captured.html; },
          addEventListener(type, fn) { captured.handlers[`${id}:${type}`] = fn; },
          querySelectorAll: () => [],
          querySelector: () => null
        });
      }
      return elements.get(id);
    }
  };
}

beforeEach(() => installGlobals());

function baseState(overrides = {}) {
  return {
    profile: {
      level: 35, age: 35, birthMonth: null, birthDay: null, birthdayPromptDismissed: false,
      lifetimeXp: 2140, rank: "Foundational",
      season: { startDate: "2026-03-13T17:00:00.000Z", earnedXp: 6200, possibleXp: 7280, lastAccrualWeek: null },
      lastLevelUp: null,
      ...(overrides.profile || {})
    },
    aspects: { finance: 60, physical: 55, mental: 70, relationships: 65, personalGoals: 50, socialContribution: 30, environment: 45, humanityFuture: 40 },
    snapshots: overrides.snapshots || [],
    levelYears: overrides.levelYears || [],
    goals: []
  };
}

// Drive the rendered form the way a user would: fill the fields, fire submit.
function submitBirthday(month, day) {
  document.getElementById("year-birthday-month").value = month;
  document.getElementById("year-birthday-day").value = day;
  captured.handlers["year-birthday-form:submit"]({ preventDefault() {} });
}

test("answering the birthday question stores it and re-renders", async () => {
  const { renderYearReview } = await import("../views/yearreview.js");
  const { stateManager } = await import("../state.js");
  stateManager.state = baseState();

  let rerendered = 0;
  renderYearReview("main-view", stateManager.state, () => { rerendered += 1; });
  submitBirthday("3", "14");

  assert.equal(stateManager.state.profile.birthMonth, 3);
  assert.equal(stateManager.state.profile.birthDay, 14);
  assert.equal(rerendered, 1, "the caller re-renders so the countdown replaces the question");
  assert.equal(stateManager.state.profile.level, 35, "answering is not a birthday — no level-up");
  assert.ok(stateManager.state.profile.lastLevelUp, "and the anchor is set");
});

test("an impossible date shows an error and stores nothing", async () => {
  const { renderYearReview } = await import("../views/yearreview.js");
  const { stateManager } = await import("../state.js");
  stateManager.state = baseState();

  let rerendered = 0;
  renderYearReview("main-view", stateManager.state, () => { rerendered += 1; });
  submitBirthday("2", "31");

  assert.equal(stateManager.state.profile.birthMonth, null, "31 February stored nothing");
  assert.equal(rerendered, 0, "and the screen stayed put so the user can fix it");
  assert.ok(document.getElementById("year-birthday-error").textContent.length > 0,
    "an inline error was shown rather than a silent no-op");
});

// "Prefer not to say" is a legitimate answer, not a validation failure. A red
// error for declining an optional question would be the app scolding someone
// for taking a boundary it explicitly offered.
test("declining the question dismisses the prompt without an error", async () => {
  const { renderYearReview } = await import("../views/yearreview.js");
  const { stateManager } = await import("../state.js");
  stateManager.state = baseState();

  let rerendered = 0;
  renderYearReview("main-view", stateManager.state, () => { rerendered += 1; });
  submitBirthday("", "");

  assert.equal(stateManager.state.profile.birthMonth, null, "nothing stored");
  assert.equal(stateManager.state.profile.birthdayPromptDismissed, true, "but the app stops asking");
  assert.equal(rerendered, 1);
  assert.equal(document.getElementById("year-birthday-error").textContent, "",
    "declining is not an error");
});

// --- MOVEMENT CARD ---

test("movement is measured from the snapshot nearest the season start", async () => {
  const { renderYearReview } = await import("../views/yearreview.js");
  renderYearReview("main-view", baseState({
    profile: { birthMonth: 3, birthDay: 14 },
    snapshots: [
      // Nearest the 13 Mar season start — the anchor.
      { date: "2026-03-15T00:00:00.000Z", aspects: { finance: 50, physical: 55, mental: 70, relationships: 65, personalGoals: 50, socialContribution: 30, environment: 45, humanityFuture: 40 } },
      { date: "2026-07-01T00:00:00.000Z", aspects: { finance: 58, physical: 55, mental: 70, relationships: 65, personalGoals: 50, socialContribution: 30, environment: 45, humanityFuture: 40 } }
    ]
  }));
  assert.ok(captured.html.includes("Movement this year"), "the movement card rendered");
  assert.ok(/\+10/.test(captured.html),
    "finance 50 -> 60 reads as +10: current score minus the ANCHOR, not minus the latest snapshot");
  const card = captured.html.split("Movement this year")[1] || "";
  assert.ok(!/Physical/.test(card.split("Years filed")[0]),
    "unchanged aspects are omitted rather than listed as +0");
});

test("no movement card when there is nothing to compare against", async () => {
  const { renderYearReview } = await import("../views/yearreview.js");
  // One snapshot is also the latest snapshot: comparing it with itself would
  // render a card of zeroes and imply a year of no change.
  renderYearReview("main-view", baseState({
    profile: { birthMonth: 3, birthDay: 14 },
    snapshots: [{ date: "2026-03-15T00:00:00.000Z", aspects: { finance: 60 } }]
  }));
  assert.ok(!captured.html.includes("Movement this year"));
});

test("a corrupt snapshot date cannot crash the screen", async () => {
  const { renderYearReview } = await import("../views/yearreview.js");
  renderYearReview("main-view", baseState({
    profile: { birthMonth: 3, birthDay: 14 },
    snapshots: [
      { date: "not-a-date", aspects: { finance: 10 } },
      { date: "2026-03-15T00:00:00.000Z", aspects: { finance: 50 } },
      { date: "2026-07-01T00:00:00.000Z", aspects: { finance: 58 } }
    ]
  }));
  assert.ok(captured.html.includes("Years filed"), "the page still rendered");
  assert.ok(!captured.html.includes("NaN"), "no NaN leaked into the copy");
});
