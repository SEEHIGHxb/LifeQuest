# Aspect Validation & Confidence Plan

Status: **planned, not started** · Drafted 2026-07-05 · Target release cache-bust: **v16**

Improve the trustworthiness of each of the 8 aspect scores across five dimensions:
input validation, data-confidence signalling, completeness validation, methodological
validity, and source/questionnaire enrichment.

## The core problem today

Every aspect silently degrades bad or missing input into a plausible-looking number:

- `parseFloat(p.income || 0)`, `parseInt(p.singleUsePlastics || 0)` — negatives and
  absurd values (weight 5000 kg, height 0) pass straight through scoring.
- `bmiScore` returns a bare `50` when weight/height are missing — indistinguishable
  from a genuine "average" result. (`aspects.js`, `state.js`)
- Survey `def` defaults (e.g. WHO-5 `def:3` × 5 → 60/100) mean a user who *skipped*
  an instrument gets a score that looks identical to one who answered "neutral."
  (`surveys.js`)
- `state.baseline` stores only instrument **sums**, so after the fact you cannot tell
  an answered instrument from a defaulted one.

**Linchpin:** without capturing input coverage *at input time*, confidence and
completeness signalling are impossible. Phase 1 must land first.

## Phase 1 — Foundation (do first; mechanical, high integrity/cost ratio)

### 1a. Input-validation module — `validation.js` (new)

- Single schema of per-field constraints. Starting set:
  - `income` 0–10,000,000
  - `weight` 20–400 (kg)
  - `height` 80–250 (cm)
  - `sleepHours` 0–24
  - `savingsRate` 0–100 (%)
  - `waterLiters` 0–15
  - `vegetablePortions` 0–50
  - `singleUsePlastics` 0–100
  - weekly activity days 0–7, mins 0–1440
  - `weeklyLearningHours` 0–168, `volunteeringHours` 0–168
  - `monthlyDonations` 0–10,000,000, `digitalLiteracy` 0–100
- `validateProfile(profile)` → `{ ok, errors: { field: message } }`.
- Called in the onboarding submit handler (`doSubmit` in `ui.js`) **before**
  `stateManager.submitOnboarding(...)`.
- Inline field errors; block submit on hard-invalid input. Keep `def` fallbacks only
  for genuinely-untouched optional fields.
- Fix `bmiScore` and any similar missing-data cases to return a null / low-confidence
  sentinel instead of `50`.

### 1b. Coverage capture (the linchpin)

- During onboarding, detect which instruments/fields the user actually **touched**
  vs left at `def` / blank.
- Persist alongside baseline:
  - `baseline.answered = { who5: true, st5: false, ... }`
  - `profile.provided = { income: true, weight: false, ... }`
- Backward-compat: absent flags → treat as "unknown," same load-merge pattern used
  for `profile.assessmentComplete` in `state.js`.

## Phase 2 — Confidence & completeness UI (read-layer on Phase 1 data)

### 2a. Per-aspect confidence tier

- In `aspects.js` / `getAspectDetail`, derive
  `confidence = answered inputs / total inputs` → **High / Partial / Estimated**.
- Badge on each aspect card and on the component rows already rendered.

### 2b. Completeness prompts

- When an aspect is scored purely from defaults, surface a cue
  ("Answer 5 questions to confirm your Mental score") on the dashboard and aspect page.
- Reuse the existing quick-start-note pattern and the express-onboarding infrastructure.

## Phase 3 — Methodological validity + source enrichment (research-heavy; fresh session)

Audit findings already visible in the code:

- **Double-count:** `weeklyLearningHours` drives *both* `personalGoals` (learning) and
  `humanityFuture` (future skills). Decide: intentional, or split the inputs.
- **Approximations flagged in-code:**
  - GSE-6 scored against GSE-10 norms (`benchmarks.js` personalGoalsBenchmark).
  - Income lognormal `INCOME_LOG_SIGMA = 0.65` is a guess.
  - WHO-5 percentiles use a **German** community sample, not a Thai one.
- **Enrichment (the extra ask):**
  - Add Thai-specific norms where obtainable.
  - Show confidence **intervals** on percentiles (the `method` label already exists).
  - Add optional *post-onboarding* "deepen this aspect" follow-up items that refine a
    score without lengthening initial onboarding (protects the progressive-onboarding
    flow already shipped).

## Cross-cutting (every phase)

- **i18n:** all new strings via `t()` / `tp()`, with Thai added to `th.js`
  (the dict-integrity test enforces placeholder parity and non-empty values).
- **Tests:** new `tests/validation.test.mjs`; extend `state` / `aspects` tests for the
  coverage flags. Keep the existing suite green.
- **Cache-bust:** bump `?v=15` → `?v=16` across `index.html` (index.css, lumi.png,
  app.js), the `ui.js` import version, and `CACHE_NAME "lifequest-v16"` in `sw.js`,
  all together.

## Recommended sequencing

1. **Phase 1** — foundation; mechanical, unlocks everything else. Highest value alone.
2. **Phase 2** — UI read-layer on Phase 1 data.
3. **Phase 3** — research-heavy sourcing; best in a dedicated session.
