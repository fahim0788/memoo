"use client";

import { useSyncStatus } from "../hooks/useSyncStatus";
import { IconSync, IconAlert, IconCheck, IconWifi } from "./Icons";
import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";

export function SyncStatus() {
  useLanguage();
  const {
    isOnline,
    pendingCount,
    listOpsPendingCount,
    reviewsPendingCount,
    isSyncing,
    hasError,
    lastSyncCount,
    mediaCaching,
    mediaCacheDone,
    mediaOfflineWarning,
  } = useSyncStatus();

  // Syncing in progress
  if (isSyncing) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#3b82f6",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <IconSync size={16} style={{ animation: "spin 1s linear infinite" }} />
        {t.sync.syncing}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Media precaching in progress
  if (mediaCaching) {
    const pct = mediaCaching.total > 0
      ? Math.round((mediaCaching.cached / mediaCaching.total) * 100)
      : 0;
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#3b82f6",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <IconSync size={16} style={{ animation: "spin 1s linear infinite" }} />
        {t.mediaCache.caching} {pct}%
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Offline with pending operations
  if (!isOnline && pendingCount > 0) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#f97316",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconWifi size={16} />
          <span>{t.sync.offlinePrefix} {pendingCount} {t.plural.operations(pendingCount)} {t.sync.pending.toLowerCase()}</span>
        </div>
      </div>
    );
  }

  // Offline without pending
  if (!isOnline) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#fbbf24",
        color: "#000",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconWifi size={16} />
          <span>{t.sync.offline}</span>
        </div>
      </div>
    );
  }

  // Media offline warning (switching to uncached list while offline)
  if (mediaOfflineWarning) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#f97316",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconAlert size={16} />
          <span>{t.mediaCache.offlineWarning}</span>
        </div>
      </div>
    );
  }

  // Error state (sync failed after retries)
  if (hasError && pendingCount > 0) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#ef4444",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconAlert size={16} />
          <span>{pendingCount} {t.plural.operations(pendingCount)} {t.sync.errorRetry}</span>
        </div>
      </div>
    );
  }

  // Pending operations
  if (pendingCount > 0) {
    const parts = [];
    if (reviewsPendingCount > 0) {
      parts.push(`${reviewsPendingCount} ${t.plural.revisions(reviewsPendingCount)}`);
    }
    if (listOpsPendingCount > 0) {
      parts.push(`${listOpsPendingCount} ${t.plural.actions(listOpsPendingCount)}`);
    }

    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#3b82f6",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconSync size={16} />
          <span>{parts.join(" + ")} {t.sync.pending.toLowerCase()}</span>
        </div>
      </div>
    );
  }

  // Media precaching complete
  if (mediaCacheDone) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#76B900",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconCheck size={16} />
          <span>{t.mediaCache.done}</span>
        </div>
      </div>
    );
  }

  // Just synced successfully
  if (lastSyncCount !== null && lastSyncCount > 0) {
    return (
      <div role="status" style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#76B900",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconCheck size={16} />
          <span>{lastSyncCount} {t.plural.revisions(lastSyncCount)} {t.sync.synchronized}</span>
        </div>
      </div>
    );
  }

  return null;
}
