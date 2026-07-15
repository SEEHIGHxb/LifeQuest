// ui.js - barrel for the view modules.
//
// The old 1,400-line ui.js is split into focused modules under views/
// (review architecture finding #13). This barrel keeps the public surface
// and the versioned "./ui.js?v=N" import path in app.js stable, so the
// cache-busting release scheme is unchanged.
export { renderOnboarding } from "./views/onboarding.js";
export { renderDashboard } from "./views/dashboard.js";
export { renderAspectPage } from "./views/aspect.js";
export { renderCheckin, renderDeepAssessment } from "./views/assessments.js";
export { renderLedger } from "./views/ledger.js";
export { renderQuests } from "./views/quests.js";
export { renderLeaderboard } from "./views/leaderboard.js";
export { getLumiTip } from "./views/assistant.js";
export { ACTION_PRESETS } from "./views/actions.js";
export { openDialog } from "./views/helpers.js";
