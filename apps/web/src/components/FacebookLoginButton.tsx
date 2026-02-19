"use client";

import { useEffect, useCallback } from "react";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: FBLoginResponse) => void, params: { scope: string }) => void;
    };
  }
}

type FBLoginResponse = {
  status: string;
  authResponse?: {
    accessToken: string;
    userID: string;
  };
};

type Props = {
  appId: string;
  onSuccess: (accessToken: string) => void;
  onError: () => void;
};

export function FacebookLoginButton({ appId, onSuccess, onError }: Props) {
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) return;

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [appId]);

  const handleClick = useCallback(() => {
    if (!window.FB) {
      onError();
      return;
    }
    window.FB.login(
      (response) => {
        if (response.status === "connected" && response.authResponse?.accessToken) {
          onSuccess(response.authResponse.accessToken);
        } else {
          onError();
        }
      },
      { scope: "email,public_profile" }
    );
  }, [onSuccess, onError]);

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
        background: "#1877F2",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 0,
        flex: "none",
      }}
      aria-label="Continue with Facebook"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    </button>
  );
}
