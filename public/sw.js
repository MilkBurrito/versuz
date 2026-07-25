// Minimal service worker: precache the Bible text maps + app shell entry, cache-first
// for static assets. Full offline sync (queued writes, IndexedDB tile cache) is a
// follow-up pass; this makes the PWA installable and keeps verse text available offline.
const CACHE = "versuz-v2"; // bumped: new app icon + shell
const PRECACHE = ["/", "/bible/kjv.json", "/bible/asv.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Cache-first for immutable static assets (bible maps, sprites, backgrounds).
  if (
    url.pathname.startsWith("/bible/") ||
    url.pathname.startsWith("/sprites/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return res;
          }),
      ),
    );
  }
});
