// View-layer XSS regression tests (node --test).
//
// tests/state.test.mjs proves the IMPORT SANITIZERS coerce hostile data to
// safe shapes. These tests prove the other half of the defence: that the views
// escape at the sink, so a hostile value that somehow reaches a template still
// cannot become markup. Both layers are deliberate — the project's stated
// posture is escape-at-sink AND sanitize-on-import, belt and suspenders.
//
// Why no happy-dom: the render functions under test only ever call
// document.getElementById(id) and assign .innerHTML. A ~10-line stub captures
// the exact string that would be handed to the parser, which is precisely what
// we want to assert on — and it keeps this a zero-dependency project.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Must exist before importing any view: views/helpers.js imports state.js,
// whose module body constructs the stateManager singleton and reads storage.
function installGlobals() {
  globalThis.localStorage = {
    store: {},
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
  const captured = { html: "" };
  globalThis.document = {
    getElementById: () => ({
      set innerHTML(v) { captured.html = v; },
      get innerHTML() { return captured.html; },
      querySelectorAll: () => [],
      addEventListener: () => {}
    })
  };
  return captured;
}

beforeEach(() => installGlobals());

// The payloads a hostile backup would realistically carry.
const PAYLOAD = '<img src=x onerror=alert(1)>';
const BREAKOUT = '"><script>alert(1)</script>';

// What actually makes a payload dangerous is an unescaped `<` opening a tag
// the parser will act on. Once escapeHtml has done its job the output still
// contains the literal text "onerror=" inside `&lt;img src=x onerror=alert(1)&gt;`
// — that is inert, and asserting against it would fail on correct code.
// So: the raw payload must not survive verbatim, no tag opener may appear, and
// the escaped form must be present (proving the value was rendered-and-escaped
// rather than silently dropped by an unrelated branch, which would make this
// test pass for the wrong reason).
function assertEscaped(html, payload, label) {
  assert.ok(!html.includes(payload), `${label}: raw payload reached innerHTML verbatim`);
  assert.ok(!/<(img|script|svg|iframe)\b/i.test(html), `${label}: an unescaped tag opener reached innerHTML`);
  assert.ok(html.includes("&lt;"), `${label}: expected the payload to appear escaped`);
}

test("renderQuests escapes a hostile goal title", async () => {
  const { renderQuests } = await import("../views/quests.js");
  const captured = installGlobals();
  renderQuests("main-view", {
    goals: [{
      id: "g1", title: PAYLOAD, description: "d", aspect: "physical",
      type: "daily", targetValue: 1, currentValue: 0, xpReward: 5, completed: false
    }]
  });
  assertEscaped(captured.html, PAYLOAD, "goal title");
});

test("renderQuests escapes goal.type — the sink t() does not protect", async () => {
  // t() and tp() return their input unchanged for unknown keys. renderQuests
  // prints t(goal.type.toUpperCase()) into a <span>, so before this was
  // escaped a hostile `type` was a live injection point.
  const { renderQuests } = await import("../views/quests.js");
  const captured = installGlobals();
  renderQuests("main-view", {
    goals: [{
      id: "g1", title: "ok", description: "d", aspect: "physical",
      type: PAYLOAD, targetValue: 1, currentValue: 0, xpReward: 5, completed: false
    }]
  });
  assertEscaped(captured.html, PAYLOAD, "goal type");
});

test("renderQuests escapes hostile milestone text and descriptions", async () => {
  const { renderQuests } = await import("../views/quests.js");
  const captured = installGlobals();
  renderQuests("main-view", {
    goals: [{
      id: "g1", title: "ok", description: BREAKOUT, aspect: "physical",
      type: "epic", targetValue: 3, currentValue: 1, xpReward: 5, completed: false,
      milestones: [{ text: PAYLOAD, at: 1, completed: false }]
    }]
  });
  assertEscaped(captured.html, PAYLOAD, "milestone text");
});

test("renderQuests escapes hostile titles on completed goals too", async () => {
  // The completed branch is separate markup — it needs its own coverage.
  const { renderQuests } = await import("../views/quests.js");
  const captured = installGlobals();
  renderQuests("main-view", {
    goals: [{
      id: "g1", title: PAYLOAD, description: "d", aspect: "physical",
      type: "daily", targetValue: 1, currentValue: 1, xpReward: 5, completed: true
    }]
  });
  assertEscaped(captured.html, PAYLOAD, "completed goal");
});

test("escapeHtml neutralises every HTML-significant character", async () => {
  const { escapeHtml } = await import("../views/helpers.js");
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  // Non-strings must not slip through unescaped via an implicit toString.
  assert.equal(escapeHtml(null), "null");
  assert.equal(escapeHtml(42), "42");
  assert.equal(escapeHtml({ toString: () => PAYLOAD }), escapeHtml(PAYLOAD));
});

test("aspectLabel escapes an unknown aspect key rather than echoing it", async () => {
  // Unknown keys fall through to the raw key, which is attacker-controlled on
  // an imported goal/action.
  const { aspectLabel } = await import("../views/helpers.js");
  const out = aspectLabel(PAYLOAD);
  assert.ok(!out.includes("<img"), "aspectLabel echoed raw markup");
  assert.ok(out.includes("&lt;"), "aspectLabel should escape an unknown key");
});
