// sw.js - LifeQuest service worker (PWA offline support)
//
// Strategy: NETWORK-FIRST with cache fallback. Online users always get fresh
// files (so a deploy is never masked by a stale cache — see the ?v=N scheme
// in index.html), and offline users get the last shell that loaded.
// Bump CACHE_NAME together with the ?v=N version on each release.

const CACHE_NAME = "lifequest-v20";

const APP_SHELL = [
  "./",
  "./index.html",
  "./index.css",
  "./app.js",
  "./state.js",
  "./ui.js",
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
  "./assets/lumi.png?v=20",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
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
    fetch(req)
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
