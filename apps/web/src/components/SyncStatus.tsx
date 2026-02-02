"use client";

import { useSyncStatus } from "../hooks/useSyncStatus";

export function SyncStatus() {
  const { isOnline, pendingCount, lastSyncCount } = useSyncStatus();

  if (!isOnline && pendingCount === 0) {
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

  if (pendingCount > 0) {
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
        🔄 {pendingCount} révision{pendingCount > 1 ? "s" : ""} en attente
      </div>
    );
  }

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
