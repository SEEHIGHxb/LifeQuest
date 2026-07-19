# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Two version numbers, on purpose

- **`APP_VERSION`** (`version.js`, currently `27`) is a monotonic **cache-bust
  counter**, not semver. It appears in the `?v=N` query on every versioned
  asset and in the service worker's `CACHE_NAME`. Bump it on *any* release that
  changes a shipped file. `tests/consistency.test.mjs` fails CI if the sites
  disagree.
- **`package.json` `version`** is semver for the project as a whole. The
  package is `private` and never published, so this is documentation only.

They are deliberately independent: a one-character CSS fix needs a cache bust
but not a minor version.

## [1.5.0] — 2026-07-18 (APP_VERSION 27)

The weekly-review redesign: daily activity logging is replaced by ONE measured
self-report per ISO week, so using the app well takes minutes a week, not a
daily ritual.

### Changed (breaking)

- **Daily activity logging is removed.** The Activity Log tab, preset and
  custom routines, the 5-logs-per-day fatigue caps, and per-log flat score
  bonuses are all gone. In their place, the new **Weekly Review** tab asks for
  rough weekly quantities ("about 2 L of water a day", "exercised 3 days"),
  prefilled with last week's answers so an unchanged week takes seconds.
- **Scores are now measured, not nudged.** The quantities you report replace
  last week's values inside the SAME cited formulas that scored your
  onboarding (`weeklyAspectShifts` in `scoring.js`), so a behavior-driven
  aspect moves exactly as much as the measured change implies — never by a
  flat +N per tap. Survey-only aspects (mental, relationships) are untouched
  by reviews and still recalibrate via the monthly re-assessment, whose small
  consistency bonus now counts weekly reviews instead of logged actions.
- **Goals are now weekly quantity pledges.** Count-of-logs goals and the
  separate weekly commitment pledge are replaced by up to 6 pledges chosen
  from 10 measurable templates (hydration, sleep, exercise days, MET-minutes,
  vegetables, learning, plastics, savings rate, donations, volunteering).
  Every pledge is auto-graded by the weekly review — nothing to log day to
  day — with streaks tracked and fixed per-template points so a self-set
  target cannot farm the economy.
- **XP economy**: weekly review pays 60 base + each met pledge's 25-40. An
  engaged week lands near ~135 points; levels now track weeks of consistency
  rather than tap volume. Existing levels and lifetime points are preserved.

### Migration (schema v3 -> v4, automatic, no data loss where a v4 meaning exists)

- Kept: profile (XP/level/lifetime points), aspect scores, the full onboarding
  baseline (incl. in-depth sections), snapshots, re-assessment history,
  crewmates, and the old action log — retained as a read-only archive.
- Converted: the three default quests with a measurable equivalent
  (`daily_water` → hydration ≥2 L/day, `weekly_workout` → exercise ≥3
  days/week, `epic_savings` → savings rate ≥10%).
- Dropped: the breathing-exercise quest (`daily_sigh`), custom routines and
  custom goals (no measurable weekly quantity maps to them), the commitment
  pledge, daily rate-limit counters, and quest reset stamps.

### Added

- `#/review`: the prefilled weekly form (IPAQ activity grid, sleep, water,
  vegetables, learning, plastics, savings; donations/volunteering under a
  collapsed monthly section), a "reviewed this week" state naming the next
  review date, past-review history, and a dashboard banner + Recent Reviews
  feed. Completing a review chains straight into the monthly re-assessment
  when that is due — one ritual, two short steps.
- Goals tab rebuilt around pledge cards (target, last week's ✓/✗ with the
  measured value, streak badge) and a bounded add-pledge form.
- Aspect pages now show a "Measured Weekly" card naming exactly which review
  fields feed that aspect's score.

### Fixed

- Radar legend no longer renders as a squeezed side column: the chart
  container is now a flex column, so the legend sits centered below the SVG
  at full card width.
- Peer Comparison table scrolls inside its card on narrow screens instead of
  making the whole page pan sideways.
- On phones the four nav tabs form a balanced 2x2 grid instead of three tabs
  plus one stretched full-width orphan on a second row.

## [1.4.0] — 2026-07-17 (APP_VERSION 26)

### Added

- **The dashboard radar now shows the population average.** A dashed outline
  drawn under your polygon marks the score an average person would get, with
  a legend and a provenance caption. The average is not hand-picked: a
  reference person assembled from the same cited statistics the benchmarks
  use (median Thai income, typical activity levels, published questionnaire
  means such as WHO-5 67.56/100; app-authored scales at their midpoints) is
  scored through the exact calculators in `scoring.js` that score you, so
  the overlay can never drift from the formulas (`averages.js`, pinned by
  `tests/averages.test.mjs`). The chart's accessible name includes both
  series, and the methodology page documents the derivation.

## [1.3.1] — 2026-07-16 (APP_VERSION 25)

### Fixed

- **In-depth questionnaires no longer render half-Thai, half-English.** The
  deep instruments' item texts deliberately stayed in English (the
  clinical-item carve-out), but items shared with the onboarding short forms
  were already translated — so Thai mode showed forms like the CFPB-10 with
  five Thai and five English questions. All 72 deep-only item texts now have
  Thai translations (unofficial renderings, faithful to the published items;
  the methodology page still cites the canonical English instruments), and
  `tests/i18n-coverage.test.mjs` now walks every survey title, item, and
  option label so a partially translated questionnaire fails CI.

## [1.3.0] — 2026-07-16 (APP_VERSION 24)

Assessment validity sprint: instrument fidelity, scoring-integrity guards,
careless-response detection, and a public methodology page.

### Changed

- **CFPB financial well-being is now scored with the official CFPB conversion
  tables** (self-administered, age-banded 18–61 / 62+) instead of the linear
  approximation — both the onboarding 5-item scale and the in-depth 10-item
  scale, so the deep recalibration delta stays metric-coherent. The in-UI
  disclosure notes now describe the official table. Existing scores adjust on
  the next re-assessment or deep section, not retroactively.
- **The sleep instrument uses the standard 6-point Jenkins Sleep Scale
  response set** ("Not at all (0 days)" … "22–31 days", past month) instead of
  a compressed 4-option adaptation. Raw range is unchanged (0–20), so stored
  baselines need no migration.
- **CFPB item 5 ("My finances control my life") uses the official
  frequency response set** (Always … Never) rather than "describes me",
  matching the published worksheet.

### Fixed

- **Thai-mode terminology made consistent.** Grit is now ความมุ่งมั่น everywhere
  (ความเพียร reserved for "perseverance"), self-efficacy is uniformly
  การรับรู้ความสามารถของตนเอง, the in-depth assessment is เชิงลึก on the
  methodology page too (was แบบเจาะลึก), and the in-depth section titles reuse
  the exact aspect names (ร่างกาย, จิตใจ, การช่วยเหลือสังคม, อนาคตมนุษยชาติ).
  Also fixed the level-up modal doubling "ระดับ: ระดับ S", a stray space before
  Thai percentile labels, and five stale dictionary entries left from the
  benchmark rewrite.

### Added

- **Scoring-integrity test guards** (`tests/scoring-integrity.test.mjs`):
  every normalizer's endpoints and direction are derived from the instrument
  definitions and pinned — editing an option value or item count now fails CI
  instead of silently misscaling scores. Composite calculators are
  bounds-checked at both extremes.
- **Straight-line (careless-response) detection**: a mixed-keyed questionnaire
  answered with the same option position on every row is demoted to
  "unanswered" at onboarding (flagged on the aspect page), and a straight-lined
  in-depth instrument is rejected outright — it never enters scoring, cannot
  mark an aspect Verified, and earns no points.
- **Methodology page** (`#/methodology`, footer link, EN/TH): per-aspect
  formulas and composite-weight rationale, instrument citations, an explicit
  "app-authored items" disclosure for the three non-standardized aspects,
  confidence-tier and benchmark explanations, and a measurement-stability
  readout computed from re-assessment history.

## [1.2.0] — 2026-07-16 (APP_VERSION 23)

Architecture cleanup (review finding #13). No user-visible behavior change.

### Changed

- **`state.js` split along responsibility lines** to satisfy the 800-line file
  rule: `defaults.js` (canonical empty state + starter quests), `sanitize.js`
  (untrusted-import coercion), and `scoring.js` (pure instrument normalizers,
  the eight aspect calculators, check-in composites, deep-assessment math, and
  level ranks). `state.js` keeps only the stateful manager.
- **Scoring formulas now have a single source of truth.** The same formulas
  previously lived in three places — onboarding calculators, `submitCheckin`
  targets, and the component breakdowns in `aspects.js` — and could silently
  drift. All three now import from `scoring.js`.
- **Importing `state.js` no longer mutates the save.** Constructing the
  manager only *reads*; the boot maintenance (periodic quest resets, weekly
  snapshot) moved to an explicit `stateManager.init()` called from `app.js`.

### Added

- **CI coverage gate**: the test job now fails if line coverage drops below
  80% or function coverage below 70% (currently ~93% / ~88%). CI Node bumped
  to 22 for the `--test-coverage-*` threshold flags.
- **Three Playwright E2E flows** (`tests/e2e.mjs`, run in the CI smoke job):
  express onboarding → dashboard, logging a routine → points/history update,
  and the EN→TH language toggle persisting across a reload.

## [1.1.0] — 2026-07-15 (APP_VERSION 22)

Hardening pass across correctness, privacy, accessibility, and release safety.

### Fixed

- **Single-use plastics were asked per *week* but scored and benchmarked per
  *day*.** An honest weekly answer was read as a daily one, scoring roughly
  7× worse than reality and dragging down the Environment aspect. The question
  is now phrased per day, the default is 3/day, and
  `tests/consistency.test.mjs` pins the unit so it cannot drift back.
- **Stale `ui.js` served the pre-split monolith.** `ui.js` changed from a
  1,400-line module into a barrel over `views/*.js` while its URL stayed at
  `?v=21`, so any browser holding the old copy kept running the old code.
  Bumped to `?v=22` and added a guard test.
- **Torn deploys.** The service worker now fetches with `cache: "no-cache"`,
  forcing revalidation. The `?v=N` scheme only ever tagged three URLs while the
  module graph has ~66 relative imports, so a returning user could otherwise
  run a fresh `app.js` against stale modules.
- Charts (radar and trend) were invisible to screen readers; both now expose
  `role="img"` and a localized `aria-label` describing the data.
- The assistant's speech bubble was an `aria-live` region, so its typewriter
  effect streamed partial words to screen readers on every navigation.
  Announcements moved to a dedicated hidden region, fired only on activation.

### Security

- **Imported goals are now sanitized.** `renderQuests` prints
  `t(goal.type.toUpperCase())` unescaped, and neither `t()` nor `tp()` escapes,
  so a hand-edited backup could smuggle markup straight into `innerHTML`.
  Goals are rebuilt to a known shape on import (enum `type`/`aspect`, numeric
  rewards, bounded milestones) *and* escaped at the sink.
- Profile enum and numeric fields are coerced on import. An unknown `region` or
  `gender` silently missed every benchmark lookup table; out-of-range numbers
  poisoned the score math.
- Content-Security-Policy tightened to `'self'`/`'none'` throughout now that no
  off-origin asset remains.

### Changed

- **Fonts are self-hosted** (`assets/fonts/`). The app no longer contacts
  `fonts.googleapis.com` or `fonts.gstatic.com`, so no visitor IP reaches a
  third party, `privacy.html`'s "no third parties" claim is literally true, and
  the PWA is genuinely offline-capable. Only the weights actually used ship
  (400/500/600/700 — the old `<link>` also pulled an unused 300).
- `ui.js` split into focused modules under `views/`.
- Manifest `theme_color`/`background_color` corrected to the real palette
  (`#24344d` / `#f7f5f0`); they previously disagreed with the stylesheet and
  flashed the wrong colour on PWA launch. Dropped `orientation` lock.
- The Pages artifact now ships only what the app loads (~1.5 MB, was ~2.2 MB
  of the entire repo including `tests/`, `docs/` and unreferenced design
  images). CI verifies every `APP_SHELL` path is staged, because
  `cache.addAll` is atomic and one 404 silently kills offline support.

### Added

- Privacy page (`privacy.html`) reachable from an in-app footer, alongside
  source and version links. The PDPA statement previously existed only in the
  repo, invisible to users of the live site.
- Backup nudge on the dashboard once there is data worth losing and the last
  export is stale (or never happened), plus `navigator.storage.persist()` after
  onboarding. `localStorage` is evictable and a "clear site data" wipes it —
  this is the only warning before the data is simply gone.
- Modal dialogs now trap focus, close on Escape/backdrop, and restore focus to
  the invoking element.
