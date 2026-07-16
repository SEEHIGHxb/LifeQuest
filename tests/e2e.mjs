// E2E user flows — run in CI by .github/workflows/ci.yml, not by `node --test`.
//
// Deliberately named .mjs, not .test.mjs: the `tests/*.test.mjs` glob must not
// pick this up, because it needs a live server and a real browser.
//
// smoke.mjs proves the app boots; this proves the three flows a real user
// actually depends on still work end-to-end (finding #13e):
//   1. express onboarding  -> dashboard renders with a real baseline
//   2. log a routine       -> points, history, and the ledger all update
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
} catch (err) {
  problems.push(`flow1 (express onboarding): ${err.message}`);
}

// --- FLOW 2: log a routine -> reward, points, and history update ---
// phys_sigh has no quantity modal, so one click logs it directly.
try {
  const before = await readState();
  await page.click("#tab-ledger");
  await page.waitForSelector('.action-card[data-id="phys_sigh"]', { timeout: 10000 });
  await page.click('.action-card[data-id="phys_sigh"]');
  // logAction writes synchronously; poll the save until the entry lands.
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state") || "{}");
    return s.history && s.history.length > 0;
  }, { timeout: 5000 });

  const after = await readState();
  const entry = after?.history?.[0];
  if (entry?.actionId !== "phys_sigh") problems.push("flow2: logged action missing from history");
  const gained = (after?.profile?.lifetimeXp || 0) - (before?.profile?.lifetimeXp || 0);
  if (gained < 10) problems.push(`flow2: expected >=10 points from the log, got ${gained}`);
  if ((after?.aspects?.mental || 0) < (before?.aspects?.mental || 0) + 5) {
    problems.push("flow2: mental aspect did not gain the +5 impact");
  }
} catch (err) {
  problems.push(`flow2 (log routine): ${err.message}`);
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
console.log("e2e passed: express onboarding, routine logging, and TH persistence all work");
