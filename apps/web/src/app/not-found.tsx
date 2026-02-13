"use client";

import { useRouter } from "next/navigation";
import { t } from "../lib/i18n";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="app">
      <div className="container" style={{ justifyContent: "center", minHeight: "100dvh", textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", margin: 0, opacity: 0.3 }}>404</h1>
        <p style={{ marginTop: "0.5rem" }}>{t.errors.notFound}</p>
        <button
          className="primary"
          onClick={() => router.push("/")}
          style={{ marginTop: "1rem" }}
        >
          {t.common.back}
        </button>
      </div>
    </div>
  );
}
