"use client";

import { useEffect, useRef } from "react";
import { t } from "../lib/i18n";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "default";
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "danger",
}: ConfirmDialogProps) {
  const confirm = confirmLabel ?? t.dialog.confirm;
  const cancel = cancelLabel ?? t.dialog.cancel;
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Auto-focus cancel button on open & handle Escape
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmStyles = {
    danger: {
      background: "rgba(239, 68, 68, 0.1)",
      color: "#dc2626",
    },
    warning: {
      background: "rgba(245, 158, 11, 0.1)",
      color: "#d97706",
    },
    default: {
      background: "rgba(118, 185, 0, 0.1)",
      color: "#76B900",
    },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
    >
      <div
        className="card"
        style={{
          maxWidth: "400px",
          width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: "1.125rem" }}>{title}</h3>
        <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>{message}</p>
        <div style={{ display: "flex", gap: "8px", marginTop: "0.5rem" }}>
          <button ref={cancelRef} onClick={onCancel} style={{ flex: 1 }}>
            {cancel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              ...confirmStyles[variant],
            }}
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
