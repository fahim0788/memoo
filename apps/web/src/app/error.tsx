"use client";

import { useRouter } from "next/navigation";
import { t } from "../lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="app">
      <div
        className="container"
        style={{
          justifyContent: "center",
          minHeight: "100dvh",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          {t.errors.unknown}
        </h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
          {error.message}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
          <button className="primary" onClick={reset}>
            {t.common.back}
          </button>
          <button
            className="secondary"
            onClick={() => router.push("/")}
          >
            Accueil
          </button>
        </div>
      </div>
    </div>
  );
}
