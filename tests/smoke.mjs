// Boot smoke test — run in CI by .github/workflows/ci.yml, not by `node --test`.
//
// Deliberately named .mjs, not .test.mjs: the `tests/*.test.mjs` glob must not
// pick this up, because it needs a live server and a real browser.
//
// The unit suite never loads index.html or app.js: it imports pure modules
// directly. Nothing else in a no-build project verifies that the module graph
// actually resolves in a browser, so a typo'd import path, a missing view, or
// a module-scope throw would ship green. This boots the real page and asserts
// it renders without a single console error.
//
// Usage: node tests/smoke.mjs <base-url>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8181";
const problems = [];

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", msg => {
  if (msg.type() === "error") problems.push(`console.error: ${msg.text()}`);
});
page.on("pageerror", err => problems.push(`uncaught: ${err.message}`));
page.on("requestfailed", req => {
  problems.push(`request failed: ${req.url()} (${req.failure()?.errorText})`);
});

// 1. The app boots to onboarding on a clean profile.
//
// The catch matters: when the module graph is broken, waitForSelector throws a
// bare "Timeout 10000ms exceeded" and — if left to propagate — kills the
// process before the far more useful listener output (the 404 for the module
// that actually failed) is ever printed. Record and continue so the report
// below names the real cause.
await page.goto(BASE, { waitUntil: "networkidle" });
try {
  await page.waitForSelector("#onboarding-mount", { timeout: 10000 });
} catch {
  problems.push("#onboarding-mount never appeared — the app did not boot");
}

// 2. Every module in the graph resolved. If any import 404s or throws, the
//    listeners above have already recorded it.
const booted = await page.evaluate(() => ({
  hasOnboarding: !!document.querySelector("#onboarding-mount"),
  title: document.title
}));
if (!booted.hasOnboarding) problems.push("onboarding never mounted");
if (!booted.title) problems.push("document.title empty — index.html did not render");

// 3. Fonts are self-hosted: nothing may leave our origin. This is the
//    executable form of privacy.html's "no third parties" claim.
const offOrigin = await page.evaluate(() =>
  performance.getEntriesByType("resource")
    .map(e => e.name)
    .filter(u => !u.startsWith(location.origin) && !u.startsWith("data:"))
);
if (offOrigin.length) {
  problems.push(`off-origin requests (privacy.html claims none): ${offOrigin.join(", ")}`);
}

// 4. The privacy page the footer links to actually exists and renders.
await page.goto(`${BASE}/privacy.html`, { waitUntil: "domcontentloaded" });
if (!(await page.title())) problems.push("privacy.html did not render");

await browser.close();

if (problems.length) {
  console.error("SMOKE FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("smoke passed: app boots clean, no console errors, no off-origin requests");
