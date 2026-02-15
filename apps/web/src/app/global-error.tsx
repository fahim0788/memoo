"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          margin: 0,
          background: "#f8fafc",
          color: "#0f172a",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Une erreur inattendue est survenue
          </h2>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
            {error.message || "Veuillez réessayer."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              background: "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
