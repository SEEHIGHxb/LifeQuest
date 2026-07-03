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
- **Routines Ledger**: preset + custom routines, 5 logs/routine/day fatigue cap
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
| `surveys.js` | Survey instrument question banks and option scales |
| `ui.js` | View rendering: onboarding, dashboard, ledger, missions, rankings |
| `chart.js` | SVG radar chart renderer |
| `tests/` | Node test suite for game/scoring logic |
