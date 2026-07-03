# LifeQuest — Life is a Game

A gamified life tracker styled after the Astral Express (Honkai: Star Rail). Complete a
scientifically-grounded baseline assessment, then log daily routines to grow eight life
aspects, earn XP, level up, and clear missions. Pure static HTML/JS/CSS — no build step,
no backend; all data lives in your browser's localStorage.

## Features

- **Baseline assessment (6 steps)** using validated instruments:
  - Finance: CFPB Financial Well-Being (5 items) + NSO Thailand income percentiles (Bangkok/Provinces) + savings rate
  - Physical: IPAQ MET-minutes, Asian BMI bands, sleep quality + duration, nutrition
  - Mental: ST-5 (Thai DMH stress index) + WHO-5 Well-Being Index
  - Relationships: LSNS-6, UCLA Loneliness (3-item), RAS (couples only)
  - Personal Goals: GSE-6 self-efficacy, Grit-S, learning habits
  - Social Contribution, Environment (GEB), and Humanity's Future (long-term index)
- **Routines Ledger**: preset + custom routines, 5 logs/routine/day fatigue cap;
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
  dashboard
- **Personalized suggestions**: a rule-based engine targets your weakest measured
  components and adapts the advice to your profile — region (Bangkok transit vs
  upcountry), employment status, and relationship status — on the dashboard
  (top 3) and on every aspect page
- **Weekly commitments**: pledge a routine count for one aspect; progress is
  pinned to the dashboard, hitting the target earns bonus XP, and the pledge
  renews every ISO week until you end it
- **Monthly re-sync**: every 28 days the short instruments (WHO-5, ST-5,
  UCLA-3, GSE-6, RAS for couples) re-run and recalibrate the survey-based
  aspects — shifts are capped at ±15 per sync, with a small bonus for
  consistent related logging (the hybrid scoring model)
- **Weekly snapshots** of all aspect scores, drawn as trend lines on aspect pages
- **Backup**: one-click JSON export / import from the header
- **Hash routing** (`#/dashboard`, `#/ledger`, `#/aspect/<key>`, `#/checkin`, ...) — browser back/forward work
- **Missions**: progress automatically from matching logged routines; daily/weekly cycles reset; epic missions with milestones
- **Radar chart**: dependency-free SVG rendering of the 8 aspects
- **Rankings**: your score alongside the Express crew
- **Lumi assistant**: contextual tips targeting your weakest aspect

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

Covers the scoring functions, XP/leveling, quest progression and resets, daily limits,
custom routines, and localStorage schema migration.

## Deploy

Static-host friendly (GitHub Pages, Netlify, etc.) — publish the repo root as-is.

## Project layout

| File | Responsibility |
|------|----------------|
| `index.html` / `index.css` | Shell and Astral Express design system |
| `app.js` | Coordinator: navigation, toasts, level-up modal, Lumi assistant |
| `state.js` | `GameStateManager`: persistence, migration, scoring, quests, XP |
| `benchmarks.js` | Population percentile benchmarks with cited sources |
| `aspects.js` | Per-aspect detail: component breakdowns and trend series |
| `suggestions.js` | Rule-based, profile-aware suggestion engine |
| `surveys.js` | Survey instrument question banks and option scales |
| `ui.js` | View rendering: onboarding, dashboard, ledger, missions, rankings |
| `chart.js` | SVG radar chart renderer |
| `tests/` | Node test suite for game/scoring logic |
