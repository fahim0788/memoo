"use client";
import { useEffect } from "react";
import { flushQueue } from "./sync";

export function PwaBoot() {
  useEffect(() => {
    // Register service worker (production only)
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(reg => {
          console.log("[PWA] Service worker registered");

          // Listen for updates
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New service worker available");
                  // Could show a "Update available" notification
                }
              });
            }
          });
        })
        .catch(err => console.error("[PWA] Service worker registration failed:", err));
    }

    // Listen for online/offline events
    function handleOnline() {
      console.log("[PWA] Connection restored - triggering sync");
      flushQueue()
        .then(count => {
          if (count > 0) {
            console.log(`[PWA] Successfully synced ${count} reviews`);
            // Dispatch custom event for UI components to listen
            window.dispatchEvent(new CustomEvent("sync-complete", { detail: { count } }));
          }
        })
        .catch(err => console.warn("[PWA] Sync failed:", err));
    }

    function handleOffline() {
      console.log("[PWA] Connection lost - working offline");
      window.dispatchEvent(new CustomEvent("connection-lost"));
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync if online
    if (navigator.onLine) {
      flushQueue().catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
