// Tests for the EN/TH localization layer (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { t, tp, getLang, setLang, percentileLabel, dateLocale } from "../i18n.js";
import { TH } from "../th.js";

function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => {
  installMockStorage();
  setLang("en"); // isolate each test from the last one's language
});

test("English is the identity translation (keys pass through)", () => {
  assert.equal(t("Overview"), "Overview");
  assert.equal(t("some string with no entry"), "some string with no entry");
});

test("Thai lookup returns the dictionary value, English key falls through", () => {
  setLang("th");
  assert.equal(t("Overview"), "ภาพรวม");
  // Unknown keys fall back to the English text, never blank
  assert.equal(t("a string not in the dictionary"), "a string not in the dictionary");
});

test("setLang persists to its own storage key and rejects junk", () => {
  setLang("th");
  assert.equal(localStorage.getItem("lifequest_lang"), "th");
  assert.equal(setLang("klingon"), "th", "unsupported languages are ignored");
  assert.equal(getLang(), "th");
});

test("tp interpolates named placeholders in both languages", () => {
  assert.equal(tp("Activity recorded: +{xp} points{detail}.", { xp: 20, detail: "" }), "Activity recorded: +20 points.");
  setLang("th");
  assert.equal(tp("Activity recorded: +{xp} points{detail}.", { xp: 20, detail: "" }), "บันทึกกิจกรรมแล้ว: +20 คะแนน");
});

test("tp leaves unknown placeholders untouched (mistakes stay visible)", () => {
  assert.equal(tp("value is {missing}", { other: 1 }), "value is {missing}");
});

test("percentileLabel uses English ordinals and a Thai prefix", () => {
  assert.equal(percentileLabel(1), "1st");
  assert.equal(percentileLabel(62), "62nd");
  assert.equal(percentileLabel(11), "11th");
  assert.equal(percentileLabel(23), "23rd");
  setLang("th");
  assert.equal(percentileLabel(62), "ที่ 62");
});

test("dateLocale tracks the active language", () => {
  assert.equal(dateLocale(), "en-US");
  setLang("th");
  assert.equal(dateLocale(), "th-TH");
});

test("every Thai value is a non-empty string and preserves {placeholders}", () => {
  for (const [key, value] of Object.entries(TH)) {
    assert.equal(typeof value, "string", `${key} maps to a string`);
    assert.ok(value.trim().length > 0, `${key} is non-empty`);
    // Any {token} in the English key must survive into the Thai value.
    const keyTokens = (key.match(/\{(\w+)\}/g) || []).sort();
    const valTokens = (value.match(/\{(\w+)\}/g) || []).sort();
    assert.deepEqual(valTokens, keyTokens, `${key} keeps the same placeholders`);
  }
});
