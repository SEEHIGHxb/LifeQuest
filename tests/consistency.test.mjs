// Static cross-file consistency guards (same approach as the i18n coverage
// guard): facts that live in more than one file must agree, and a mismatch
// must fail CI rather than ship.
//
//   1. Plastics unit: the onboarding question, the scoring bands, the
//      benchmark, and every display string are all in pieces/DAY. The
//      question label drifting back to "per Week" (the original review
//      finding) silently zeroes honest answers, so the unit is pinned here.
//   2. Release version: APP_VERSION, the ?v=N cache busters, and the service
//      worker's CACHE_NAME must all agree. This is not cosmetic. ui.js was
//      once a 1,400-line monolith and is now a barrel over views/*.js — an
//      identical URL serving completely different code. A browser still
//      holding ui.js?v=21 from before that split keeps running the monolith,
//      so a half-bumped release ships a torn app to returning users only,
//      which no amount of local testing would catch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { APP_VERSION } from "../version.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every file that renders or scores user-facing text.
function sourceFiles() {
  const rootJs = readdirSync(root).filter(f => f.endsWith(".js"));
  const viewJs = existsSync(join(root, "views"))
    ? readdirSync(join(root, "views")).map(f => join("views", f)).filter(f => f.endsWith(".js"))
    : [];
  return [...rootJs, ...viewJs, "index.html"];
}

const read = f => readFileSync(join(root, f), "utf8");

test("plastics are asked, scored, and displayed in pieces per DAY everywhere", () => {
  const sources = sourceFiles().map(f => ({ f, src: read(f) }));

  // The question itself must be phrased per day…
  const asksPerDay = sources.some(({ src }) => src.includes("Single-Use Plastic Items per Day"));
  assert.ok(asksPerDay, 'onboarding must ask "Single-Use Plastic Items per Day"');

  // …and no file may reintroduce a weekly phrasing for plastics.
  for (const { f, src } of sources) {
    assert.ok(
      !/plastic[^"'`]*per week/i.test(src),
      `${f}: plastics phrased per week — the scoring bands and Thai-average benchmark are daily`
    );
  }
});

test("every ?v=N cache buster matches APP_VERSION", () => {
  // Any ?v=<digits> in the two files that reference versioned assets.
  for (const f of ["index.html", "app.js"]) {
    const found = [...read(f).matchAll(/\?v=(\d+)/g)].map(m => m[1]);
    assert.ok(found.length > 0, `${f}: expected at least one ?v=N cache buster`);
    for (const v of found) {
      assert.equal(v, APP_VERSION, `${f}: ?v=${v} drifted from APP_VERSION ${APP_VERSION}`);
    }
  }
});

test("the service worker CACHE_NAME matches APP_VERSION", () => {
  const src = read("sw.js");
  const found = [...src.matchAll(/lifequest-v(\d+)/g)].map(m => m[1]);
  assert.ok(found.length > 0, "sw.js: expected a lifequest-vN CACHE_NAME");
  for (const v of found) {
    assert.equal(v, APP_VERSION, `sw.js: CACHE_NAME v${v} drifted from APP_VERSION ${APP_VERSION}`);
  }
  // A stale CACHE_NAME leaves the old cache live; a stale ?v= inside the shell
  // list precaches a URL the page never requests.
  for (const v of [...src.matchAll(/\?v=(\d+)/g)].map(m => m[1])) {
    assert.equal(v, APP_VERSION, `sw.js: APP_SHELL ?v=${v} drifted from APP_VERSION ${APP_VERSION}`);
  }
});

test("the footer version the user sees comes from APP_VERSION, not a literal", () => {
  // index.html ships a placeholder, but applyChromeTranslations must overwrite
  // it from the constant — otherwise the footer can silently claim a version
  // the code isn't.
  assert.match(
    read("app.js"),
    /setText\("footer-version",\s*tp\("Version \{v\}",\s*\{\s*v:\s*APP_VERSION\s*\}\)\)/,
    "app.js must render the footer version from APP_VERSION"
  );
});

test("the service worker precaches every module in the graph", () => {
  // The shell list is hand-maintained. A module added to views/ but forgotten
  // here still works online and breaks only offline — the exact bug a local
  // check never sees. cache.addAll is atomic, so a path that 404s would also
  // silently disable the whole offline shell.
  const shell = read("sw.js");
  const missing = sourceFiles()
    .filter(f => f.endsWith(".js") && f !== "sw.js")
    .map(f => f.split("\\").join("/"))
    .filter(f => !shell.includes(`"./${f}"`));
  assert.deepEqual(missing, [], `sw.js APP_SHELL is missing: ${missing.join(", ")}`);
});
