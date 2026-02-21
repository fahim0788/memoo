"use client";

import { useCallback, useEffect } from "react";

type Props = {
  clientId: string;
  onSuccess: (code: string, redirectUri: string) => void;
  onError: () => void;
};

export function LinkedInLoginButton({ clientId, onSuccess, onError }: Props) {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "LINKEDIN_AUTH_CODE") return;
      if (event.data.code) {
        onSuccess(event.data.code, event.data.redirectUri);
      } else {
        onError();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError]);

  const handleClick = useCallback(() => {
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const state = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile email",
      state,
    });
    const url = `https://www.linkedin.com/oauth/v2/authorization?${params}`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(url, "linkedin-auth", `width=${width},height=${height},left=${left},top=${top}`);
  }, [clientId]);

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        width: 40,
        height: 40,
        padding: 0,
        border: "1px solid var(--color-border)",
        borderRadius: 4,
        background: "#0A66C2",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 0,
        flex: "none",
      }}
      aria-label="Continue with LinkedIn"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </button>
  );
}
