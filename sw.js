// sw.js - LifeQuest service worker (PWA offline support)
//
// Strategy: NETWORK-FIRST with cache fallback. Online users always get fresh
// files, and offline users get the last shell that loaded.
// Bump CACHE_NAME together with the ?v=N version on each release.
//
// Every fetch here is issued with cache: "no-cache", which forces the browser
// to revalidate against the origin instead of serving its own HTTP cache. That
// is what actually makes "network-first" true, and it is load-bearing: the
// ?v=N query only tags three URLs (index.css, app.js, ui.js), while the module
// graph has ~66 relative imports — state.js, chart.js, views/*.js and the rest
// carry no version at all. Without revalidation a returning user could get a
// fresh app.js against stale view modules: a torn deploy, half-new half-old.
// Revalidation costs a conditional request per file and answers 304 when
// nothing changed, so the bandwidth is negligible and the version can never
// tear. Do NOT "optimise" this back to a plain fetch(req).

const CACHE_NAME = "lifequest-v25";

const APP_SHELL = [
  "./",
  "./index.html",
  "./privacy.html",
  "./index.css",
  "./app.js",
  "./version.js",
  "./state.js",
  "./defaults.js",
  "./sanitize.js",
  "./scoring.js",
  "./ui.js",
  "./views/helpers.js",
  "./views/instrument-forms.js",
  "./views/actions.js",
  "./views/assistant.js",
  "./views/onboarding.js",
  "./views/dashboard.js",
  "./views/aspect.js",
  "./views/assessments.js",
  "./views/methodology.js",
  "./views/ledger.js",
  "./views/quests.js",
  "./views/leaderboard.js",
  "./chart.js",
  "./surveys.js",
  "./benchmarks.js",
  "./aspects.js",
  "./validation.js",
  "./suggestions.js",
  "./crewcode.js",
  "./i18n.js",
  "./th.js",
  "./manifest.webmanifest",
  "./assets/lumi.png?v=25",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  // Self-hosted faces. Only the subsets the UI can actually render are
  // precached: `latin` covers the English copy, `thai` covers th.js. The
  // `latin-ext` files are declared in fonts.css but left out on purpose —
  // unicode-range means the browser only fetches them for accented
  // codepoints our own copy never contains, so precaching them would add
  // ~415 KB to every install to cover user-typed routine names alone.
  "./assets/fonts/fonts.css",
  "./assets/fonts/inter-latin-400.woff2",
  "./assets/fonts/inter-latin-500.woff2",
  "./assets/fonts/inter-latin-600.woff2",
  "./assets/fonts/inter-latin-700.woff2",
  "./assets/fonts/source-serif-4-latin-400.woff2",
  "./assets/fonts/source-serif-4-latin-600.woff2",
  "./assets/fonts/source-serif-4-latin-700.woff2",
  "./assets/fonts/sarabun-thai-400.woff2",
  "./assets/fonts/sarabun-thai-500.woff2",
  "./assets/fonts/sarabun-thai-600.woff2",
  "./assets/fonts/sarabun-thai-700.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Same reasoning as the fetch handler: a plain addAll can populate the
      // new cache from the browser's stale HTTP entries, which would bake a
      // torn deploy into the offline shell for the life of this CACHE_NAME.
      .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "no-cache" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        // ignoreSearch lets a cached "app.js" satisfy "app.js?v=N" offline.
        caches.match(req, { ignoreSearch: true }).then(hit =>
          hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())
        )
      )
  );
});
