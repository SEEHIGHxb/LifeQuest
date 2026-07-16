# Life Balance Index — Personal Wellbeing Assessment

A formal, static self-assessment dashboard. Complete a scientifically-grounded baseline
assessment, then log daily routines to track eight life aspects, accrue points, advance
proficiency tiers, and clear goals. Pure static HTML/JS/CSS — no build step, no backend;
all data lives in your browser's localStorage.

> **Live at [seehighxb.github.io/LifeBalanceIndex](https://seehighxb.github.io/LifeBalanceIndex/)**
> (repo [`SEEHIGHxb/LifeBalanceIndex`](https://github.com/SEEHIGHxb/LifeBalanceIndex), formerly *LifeQuest*).
> Internal storage keys, the export filename prefix, and the `LQ1-` comparison-code
> prefix keep the legacy `lifequest`/`LQ1` names for backward compatibility.

Bilingual: the whole UI switches between **English and Thai (ไทย)** with the header
toggle — surveys, benchmarks, recommendations, goals, and toasts included. Thai text is
set in Sarabun.

## Features

- **Baseline assessment (6 steps)** using validated instruments:
  - Finance: CFPB Financial Well-Being (5 items) + NSO Thailand income percentiles (Bangkok/Provinces) + savings rate
  - Physical: IPAQ MET-minutes, Asian BMI bands, sleep quality + duration, nutrition
  - Mental: ST-5 (Thai DMH stress index) + WHO-5 Well-Being Index
  - Relationships: LSNS-6, UCLA Loneliness (3-item), RAS (couples only)
  - Personal Goals: GSE-6 self-efficacy, Grit-S, learning habits
  - Social Contribution, Environment (GEB), and Humanity's Future (long-term index)
- **Activity Log**: preset + custom routines, 5 logs/routine/day fatigue cap;
  quantifiable routines record real amounts (minutes, THB, liters) as measured data
- **Society benchmarks**: each aspect shows your approximate percentile against
  published population statistics (NSO income/wages, Thai physical-activity
  surveillance, WHO-5 community norms, DMH ST-5 bands, UCLA-3/LSNS-6 samples,
  GSE 25-country norms, CAF World Giving Index, Thai plastic-use and pension
  coverage data) — every number cites its source in the UI, and estimates are
  labeled as estimates
- **Dedicated aspect pages** (`#/aspect/physical`, ...): percentile gauge vs
  society, component breakdown (e.g., Physical → Activity / Body / Sleep /
  Nutrition), trend chart of weekly snapshots, and one-tap logging of the
  routines that target that aspect — reachable by clicking any aspect on the
  Overview
- **Personalized recommendations**: a rule-based engine targets your weakest measured
  components and adapts the advice to your profile — region (Bangkok transit vs
  upcountry), employment status, and relationship status — on the Overview
  (top 3) and on every aspect page
- **Weekly commitments**: pledge a routine count for one aspect; progress is
  pinned to the Overview, hitting the target earns bonus points, and the pledge
  renews every ISO week until you end it
- **Monthly re-assessment**: every 28 days the short instruments (WHO-5, ST-5,
  UCLA-3, GSE-6, RAS for couples) re-run and recalibrate the survey-based
  aspects — shifts are capped at ±15 per re-assessment, with a small bonus for
  consistent related logging (the hybrid scoring model)
- **Weekly snapshots** of all aspect scores, drawn as trend lines on aspect pages
- **Backup**: one-click JSON export / import from the header
- **Hash routing** (`#/dashboard`, `#/ledger`, `#/aspect/<key>`, `#/checkin`, ...) — browser back/forward work
- **Goals**: progress automatically from matching logged routines; daily/weekly cycles reset; milestone goals with checkpoints
- **Radar chart**: dependency-free SVG rendering of the 8 aspects
- **Peer comparison (comparison codes)**: share your `LQ1-...` code with
  others and paste theirs to compare against real users — codes carry only name,
  level, points, and aspect scores; no backend, no accounts. Sample profiles pad
  the board until you add participants
- **PWA**: installable with offline support — a network-first service worker
  always serves fresh files online and the cached shell offline
- **Bilingual (EN / ไทย)**: a header toggle re-renders the whole app in
  English or Thai and remembers the choice (in its own localStorage key, so
  it survives a data reset). Every user-facing string — survey items, benchmark
  summaries, recommendations, goals, and toasts — is translated; literature
  citations stay in English on purpose
- **Guidance assistant**: contextual, neutrally-worded tips targeting your weakest aspect

## Run locally

ES modules require a web server (opening `index.html` via `file://` will not work):

```bash
npm start            # http-server on http://localhost:8123
# or
python -m http.server 8123
```

## Tests

```bash
npm test             # node --test (requires Node 18+)
```

Covers the scoring functions, points/leveling, goal progression and resets, daily limits,
custom routines, and localStorage schema migration.

## Deploy

CI (`.github/workflows/ci.yml`) runs the test suite on every push and PR, and
deploys the repo root to GitHub Pages on every green push to `main` (the
workflow enables Pages automatically on first run). Any other static host
works too — publish the repo root as-is.

When releasing, bump both cache busters together: the `?v=N` query on the
entry points in `index.html`/`app.js` and `CACHE_NAME` in `sw.js`.

## Design

Formal / academic look: warm-paper background (`#f7f5f0`), white cards, muted
borders, navy primary (`#24344d`) with a restrained burgundy accent (`#6d2e3f`).
Headings are set in **Source Serif 4**, body text in **Inter**, and Thai in
**Sarabun**; numeric readouts use a monospace stack. Flat surfaces, thin borders,
~4px radii — no gradients, glows, or text-shadows.

## Project layout

| File | Responsibility |
|------|----------------|
| `index.html` / `index.css` | Shell and formal design system |
| `app.js` | Coordinator: navigation, toasts, level-up modal, guidance assistant |
| `state.js` | `GameStateManager`: persistence, migration, scoring, goals, points |
| `benchmarks.js` | Population percentile benchmarks with cited sources |
| `aspects.js` | Per-aspect detail: component breakdowns and trend series |
| `suggestions.js` | Rule-based, profile-aware recommendation engine |
| `crewcode.js` | Shareable comparison codes for real user-vs-user comparison |
| `i18n.js` / `th.js` | EN/TH localization layer and the Thai dictionary |
| `sw.js` / `manifest.webmanifest` | PWA: offline service worker and install manifest |
| `surveys.js` | Survey instrument question banks and option scales |
| `ui.js` | View rendering: onboarding, dashboard, activity log, goals, peer comparison |
| `chart.js` | SVG radar chart renderer |
| `tests/` | Node test suite for assessment/scoring logic |
