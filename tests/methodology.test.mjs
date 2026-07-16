// Tests for the methodology page (#/methodology): the score-stability readout
// and the transparency guarantees the page exists to provide — citations for
// validated instruments and an explicit disclosure for app-authored ones.
import { test } from "node:test";
import assert from "node:assert/strict";

// Globals must exist before importing any view (views/helpers.js pulls in
// state.js). Same minimal stub approach as views-xss.test.mjs.
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

const { scoreStability, renderMethodology } = await import("../views/methodology.js");

test("scoreStability is null without check-ins and averages absolute shifts with them", () => {
  assert.equal(scoreStability(null), null);
  assert.equal(scoreStability({ checkins: [] }), null);
  assert.equal(scoreStability({ checkins: [{ date: "2026-01-01", sums: {}, shifts: {} }] }), null);

  const state = {
    checkins: [
      { date: "2026-01-01", sums: {}, shifts: { mental: -4, relationships: 2 } },
      { date: "2026-02-01", sums: {}, shifts: { mental: 6 } }
    ]
  };
  // |−4| + |2| + |6| over 3 shifts = 4.
  assert.deepEqual(scoreStability(state), { count: 2, avg: 4 });
});

test("the methodology page cites validated instruments and discloses app-authored ones", () => {
  renderMethodology("main-view", { checkins: [] });
  const html = captured.html;
  assert.match(html, /consumerfinance\.gov/, "CFPB citation present");
  assert.match(html, /Jenkins et al\./, "JSS citation present");
  assert.match(html, /Schwarzer & Jerusalem|Schwarzer &amp; Jerusalem/, "GSE citation present");
  assert.match(html, /App-authored behavioral items/, "unstandardized aspects are disclosed, not dressed up");
  assert.match(html, /not a medical or psychological diagnosis/, "disclaimer present");
  assert.match(html, /Complete a monthly re-assessment/, "stability placeholder shown without check-ins");
});

test("the stability line reports count and average once check-ins exist", () => {
  renderMethodology("main-view", {
    checkins: [{ date: "2026-01-01", sums: {}, shifts: { mental: 3, personalGoals: -5 } }]
  });
  assert.match(captured.html, /shifted by an average of 4 points/, "average |3|,|−5| = 4");
});
