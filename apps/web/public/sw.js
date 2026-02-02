/* MemoList MVP SW - offline-first with automatic sync */
const CACHE_NAME = "memolist-v2";
const ASSETS = [
  "/",
  "/manifest.webmanifest"
];

// Message types for communication with clients
const MSG_SYNC_TRIGGERED = "sync-triggered";
const MSG_SYNC_COMPLETE = "sync-complete";

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error("[SW] Install failed:", err))
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          })
        )
      )
      .then(() => self.clients.claim())
      .catch(err => console.error("[SW] Activate failed:", err))
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Don't cache API calls
  if (url.pathname.startsWith("/api/")) {
    // For API calls, use network-first strategy
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline", offline: true }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // For navigation, serve cached shell then network
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("/").then(cached => cached || fetch(req).catch(() => cached))
    );
    return;
  }

  // Cache-first for same-origin assets with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Return cached, but also fetch in background to update cache
          fetch(req).then((res) => {
            if (res && res.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone())).catch(()=>{});
            }
          }).catch(()=>{});
          return cached;
        }

        // No cache, fetch from network
        return fetch(req).then((res) => {
          if (res && res.ok && req.method === "GET") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
          }
          return res;
        }).catch(() => {
          return new Response("Offline", { status: 503 });
        });
      })
    );
  }
});

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "SYNC_NOW") {
    console.log("[SW] Manual sync requested");
    notifyClients(MSG_SYNC_TRIGGERED);
  }
});

// Notify all clients
function notifyClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: message }));
  });
}
