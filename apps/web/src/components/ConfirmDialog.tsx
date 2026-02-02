type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: "400px",
          margin: "1rem",
          background: "white",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p>{message}</p>
        <div style={{ display: "flex", gap: "8px", marginTop: "1rem" }}>
          <button onClick={onCancel} style={{ flex: 1 }}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="primary"
            style={{
              flex: 1,
              background: "#ef4444",
              borderColor: "#dc2626",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
