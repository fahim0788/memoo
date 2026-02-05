"use client";

import { useSyncStatus } from "../hooks/useSyncStatus";

export function SyncStatus() {
  const {
    isOnline,
    pendingCount,
    listOpsPendingCount,
    reviewsPendingCount,
    isSyncing,
    hasError,
    lastSyncCount,
  } = useSyncStatus();

  // Syncing in progress
  if (isSyncing) {
    return (
      <div style={{
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
        <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
        Synchronisation...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Offline with pending operations
  if (!isOnline && pendingCount > 0) {
    return (
      <div style={{
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
        📡 Hors ligne • {pendingCount} opération{pendingCount > 1 ? "s" : ""} en attente
      </div>
    );
  }

  // Offline without pending
  if (!isOnline) {
    return (
      <div style={{
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
        📡 Hors ligne
      </div>
    );
  }

  // Error state (sync failed after retries)
  if (hasError && pendingCount > 0) {
    return (
      <div style={{
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
        ⚠️ {pendingCount} opération{pendingCount > 1 ? "s" : ""} en erreur (réessai automatique)
      </div>
    );
  }

  // Pending operations
  if (pendingCount > 0) {
    const parts = [];
    if (reviewsPendingCount > 0) {
      parts.push(`${reviewsPendingCount} révision${reviewsPendingCount > 1 ? "s" : ""}`);
    }
    if (listOpsPendingCount > 0) {
      parts.push(`${listOpsPendingCount} action${listOpsPendingCount > 1 ? "s" : ""}`);
    }

    return (
      <div style={{
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
        🔄 {parts.join(" + ")} en attente
      </div>
    );
  }

  // Just synced successfully
  if (lastSyncCount !== null && lastSyncCount > 0) {
    return (
      <div style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "#22c55e",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.875rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        ✅ {lastSyncCount} révision{lastSyncCount > 1 ? "s" : ""} synchronisée{lastSyncCount > 1 ? "s" : ""}
      </div>
    );
  }

  return null;
}
