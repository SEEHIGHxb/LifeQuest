// version.js - single source of truth for the release version.
//
// Bump THIS value on each release. The other version sites — the ?v=N cache
// busters in index.html, the ui.js import in app.js, and CACHE_NAME in
// sw.js — must carry the same number; tests/consistency.test.mjs fails CI
// when any of them drift, so a release can no longer half-bump.
export const APP_VERSION = "28";
