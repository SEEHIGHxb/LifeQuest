// Finding #10 — static i18n coverage guard.
// Every LITERAL t("...")/tp("...") key in the core user-facing modules must
// have a Thai entry in th.js, so hardcoded English can't silently leak into
// Thai mode. Dynamic calls (t(variable)) can't be checked statically and are
// skipped. surveys.js is intentionally excluded: its ~94 deep clinical-
// instrument item texts are kept in the validated source language (the
// documented clinical-item carve-out).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TH } from "../th.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "ui.js", "app.js", "aspects.js", "benchmarks.js",
  "suggestions.js", "state.js", "crewcode.js", "chart.js", "validation.js",
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
