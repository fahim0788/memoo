"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LinkedInCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;

    if (window.opener) {
      window.opener.postMessage(
        { type: "LINKEDIN_AUTH_CODE", code: code || null, redirectUri },
        window.location.origin
      );
      window.close();
    }
  }, [searchParams]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
      <p>Connexion LinkedIn en cours…</p>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
          <p>Chargement…</p>
        </div>
      }
    >
      <LinkedInCallbackContent />
    </Suspense>
  );
}
