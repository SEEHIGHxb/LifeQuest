// Finding #10 — static i18n coverage guard.
// Every LITERAL t("...")/tp("...") key in the core user-facing modules must
// have a Thai entry in th.js, so hardcoded English can't silently leak into
// Thai mode. Dynamic calls (t(variable)) can't be checked statically and are
// skipped. Survey DATA (instrument titles, item texts, option labels) is
// rendered through t() as t(variable), so a second test walks the survey
// definitions directly — a partially translated questionnaire (some items
// Thai, some English) is exactly the regression it guards against.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TH } from "../th.js";
import { INSTRUMENTS, DEEP_INSTRUMENTS, DEEP_SECTIONS } from "../surveys.js";
import { GOAL_TEMPLATES } from "../goals.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "ui.js", "app.js", "aspects.js", "benchmarks.js",
  "suggestions.js", "state.js", "defaults.js", "sanitize.js", "scoring.js",
  "crewcode.js", "chart.js", "validation.js", "goals.js",
  // ui.js is now a barrel — the actual t()/tp() literals live in views/.
  ...readdirSync(join(root, "views")).filter(f => f.endsWith(".js")).map(f => join("views", f))
];

// Strings deliberately rendered in English even in Thai mode (documented).
const ALLOWLIST = new Set([]);

// Pull the first string-literal argument out of t(...) / tp(...). The negative
// lookbehind avoids matching method calls like `foo.t(`.
function extractKeys(src) {
  const keys = new Set();
  const re = /(?<![.\w])t(?:p)?\(\s*(["'])((?:\\.|(?!\1).)*)\1/g;
  let m;
  while ((m = re.exec(src))) {
    keys.add(m[2].replace(/\\(["'\\])/g, "$1"));
  }
  return keys;
}

test("every literal t()/tp() key in the core UI has a Thai translation (#10)", () => {
  const missing = [];
  for (const file of FILES) {
    const src = readFileSync(join(root, file), "utf8");
    for (const key of extractKeys(src)) {
      if (!Object.hasOwn(TH, key) && !ALLOWLIST.has(key)) {
        missing.push(`${file}: ${JSON.stringify(key)}`);
      }
    }
  }
  assert.equal(
    missing.length, 0,
    `Untranslated t()/tp() keys (add to th.js or the ALLOWLIST):\n${missing.join("\n")}`
  );
});

test("every survey title, item text, and option label has a Thai translation", () => {
  const missing = [];
  const check = (key, where) => {
    if (!Object.hasOwn(TH, key) && !ALLOWLIST.has(key)) {
      missing.push(`${where}: ${JSON.stringify(key)}`);
    }
  };
  for (const [dictName, dict] of [["INSTRUMENTS", INSTRUMENTS], ["DEEP_INSTRUMENTS", DEEP_INSTRUMENTS]]) {
    for (const [instrKey, instr] of Object.entries(dict)) {
      check(instr.title, `${dictName}.${instrKey}.title`);
      for (const item of instr.items) {
        check(item.text, `${dictName}.${instrKey}`);
        for (const o of item.options) check(o.l, `${dictName}.${instrKey} option`);
      }
    }
  }
  for (const section of DEEP_SECTIONS) {
    check(section.title, `DEEP_SECTIONS.${section.aspect}.title`);
    check(section.blurb, `DEEP_SECTIONS.${section.aspect}.blurb`);
  }
  // Pledge templates render via t(variable) too — same partial-translation
  // hazard as the surveys, same data-walking guard.
  for (const [id, tmpl] of Object.entries(GOAL_TEMPLATES)) {
    check(tmpl.title, `GOAL_TEMPLATES.${id}.title`);
    check(tmpl.desc, `GOAL_TEMPLATES.${id}.desc`);
    check(tmpl.unit, `GOAL_TEMPLATES.${id}.unit`);
  }
  assert.equal(
    missing.length, 0,
    `Untranslated survey strings — these render half-Thai, half-English forms in Thai mode:\n${missing.join("\n")}`
  );
});
