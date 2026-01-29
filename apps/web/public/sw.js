/* MemoList MVP SW - simple cache-first for app shell */
const CACHE_NAME = "memolist-v1";
const ASSETS = [
  "/",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Don't cache API calls
  if (url.pathname.startsWith("/api/")) return;

  // For navigation, serve cached shell then network
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("/").then(cached => cached || fetch(req))
    );
    return;
  }

  // Cache-first for same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
          return res;
        }).catch(() => cached);
      })
    );
  }
});
