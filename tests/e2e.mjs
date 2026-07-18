// E2E user flows — run in CI by .github/workflows/ci.yml, not by `node --test`.
//
// Deliberately named .mjs, not .test.mjs: the `tests/*.test.mjs` glob must not
// pick this up, because it needs a live server and a real browser.
//
// smoke.mjs proves the app boots; this proves the three flows a real user
// actually depends on still work end-to-end (finding #13e):
//   1. express onboarding  -> dashboard renders with a real baseline + radar average
//   2. weekly review       -> measured quantities land, pledges grade, points pay
//   3. EN -> TH toggle     -> persists across a full reload
//
// Usage: node tests/e2e.mjs <base-url>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8181";
const problems = [];

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("pageerror", err => problems.push(`uncaught: ${err.message}`));
page.on("console", msg => {
  if (msg.type() === "error") problems.push(`console.error: ${msg.text()}`);
});

const readState = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem("lifequest_state") || "null"));

// --- FLOW 1: express onboarding -> dashboard ---
// Fill a name, walk to the step where "See my results now" unlocks, take it.
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("#onboarding-form", { timeout: 10000 });
  await page.fill("#onb-name", "E2E Runner");

  // Pages 0 and 1 -> page 2, where the express button first renders.
  await page.click('#onb-page-0 .btn-onb-next');
  await page.click('#onb-page-1 .btn-onb-next');
  await page.click('#onb-page-2 .btn-onb-express');

  await page.waitForSelector("#tab-dashboard", { timeout: 10000 });
  const state = await readState();
  if (!state?.onboarded) problems.push("flow1: state not onboarded after express finish");
  if (state?.profile?.name !== "E2E Runner") problems.push("flow1: profile name not saved");
  if (state?.profile?.assessmentComplete !== false) {
    problems.push("flow1: express baseline must be marked assessmentComplete=false");
  }
  if (!state?.baseline?.date) problems.push("flow1: no baseline captured");
  const dashboardText = await page.textContent("#main-view");
  if (!dashboardText || dashboardText.length < 100) {
    problems.push("flow1: dashboard rendered empty");
  }
  // The population-average overlay: a dashed polygon under the user's own.
  const avgPolygon = await page.$('#radar-chart-container polygon[stroke-dasharray="5,4"]');
  if (!avgPolygon) problems.push("flow1: radar is missing the dashed population-average polygon");
} catch (err) {
  problems.push(`flow1 (express onboarding): ${err.message}`);
}

// --- FLOW 2: weekly review -> measured values land, pledges grade, points pay ---
// Onboarding counts as this week's measurement, so backdate the baseline a
// week to make the review due, exactly as a returning user would find it.
try {
  const before = await readState();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    s.baseline.date = new Date(Date.now() - 8 * 86400000).toISOString();
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.click("#tab-review");
  await page.waitForSelector("#weekly-review-form", { timeout: 10000 });

  // The form is prefilled; only touch what changed this week.
  await page.fill("#rev-waterLiters", "2.5");
  await page.click('#weekly-review-form button[type="submit"]');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state") || "{}");
    return s.reviews && s.reviews.length > 0;
  }, { timeout: 5000 });
  // The 60+ points can trigger the level-up dialog; Escape dismisses it.
  await page.keyboard.press("Escape");

  const after = await readState();
  const review = after?.reviews?.[0];
  if (!/^\d{4}-W\d+$/.test(review?.week || "")) {
    problems.push(`flow2: review week key malformed (${review?.week})`);
  }
  if (review?.inputs?.waterLiters !== 2.5) problems.push("flow2: measured water intake not recorded");
  if (after?.profile?.waterLiters !== 2.5) problems.push("flow2: measured value did not land in the profile");
  const gained = (after?.profile?.lifetimeXp || 0) - (before?.profile?.lifetimeXp || 0);
  if (gained < 60) problems.push(`flow2: expected >=60 points from the review, got ${gained}`);
  const waterPledge = after?.goals?.find(g => g.templateId === "water");
  if (!waterPledge?.lastResult) {
    problems.push("flow2: water pledge was not graded by the review");
  } else if (waterPledge.lastResult.met !== true) {
    problems.push("flow2: 2.5 L/day must meet the 2 L/day default pledge");
  }
} catch (err) {
  problems.push(`flow2 (weekly review): ${err.message}`);
}

// --- FLOW 3: EN -> TH language toggle persists across reload ---
try {
  await page.click("#btn-lang");
  const lang = await page.evaluate(() => localStorage.getItem("lifequest_lang"));
  if (lang !== "th") problems.push(`flow3: toggle stored "${lang}", expected "th"`);
  const thaiBefore = await page.evaluate(() => /[฀-๿]/.test(document.body.innerText));
  if (!thaiBefore) problems.push("flow3: no Thai text rendered after toggle");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#tab-dashboard", { timeout: 10000 });
  const thaiAfter = await page.evaluate(() => /[฀-๿]/.test(document.body.innerText));
  if (!thaiAfter) problems.push("flow3: Thai did not survive the reload");
  const persisted = await page.evaluate(() => localStorage.getItem("lifequest_lang"));
  if (persisted !== "th") problems.push("flow3: language choice lost on reload");
} catch (err) {
  problems.push(`flow3 (language persistence): ${err.message}`);
}

await browser.close();

if (problems.length) {
  console.error("E2E FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("e2e passed: express onboarding, the weekly review, and TH persistence all work");
