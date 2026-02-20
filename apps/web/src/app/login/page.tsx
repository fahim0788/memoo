"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { FacebookLoginButton } from "../../components/FacebookLoginButton";
import { useAuth } from "../../contexts/AuthContext";
import { forgotPassword, resendCode, resetPassword } from "../../lib/auth";
import { t } from "../../lib/i18n";
import { useLanguage } from "../../hooks/useLanguage";
import { trackPageVisit, trackRegistrationStarted, trackEmailVerificationSent } from "../../lib/event-tracker";

type Mode = "login" | "register" | "verify-email" | "forgot-password" | "reset-password";

const linkStyle = {
  background: "none",
  border: "none",
  padding: 0,
  minWidth: 0,
  flex: "none",
  color: "#76B900",
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: "inherit",
  fontWeight: 400,
} as const;

export default function LoginPage() {
  useLanguage();
  const router = useRouter();
  const { user, loading: authLoading, login, googleLogin, facebookLogin, register, verifyEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Already logged in → redirect
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Track page visit on mount
  useEffect(() => {
    trackPageVisit("login");
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const startResendCooldown = useCallback(() => setResendCountdown(60), []);

  if (!authLoading && user) return null;

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";

  async function handleGoogleSuccess(credential: string) {
    setError("");
    setLoading(true);
    try {
      await googleLogin(credential);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknown);
    } finally {
      setLoading(false);
    }
  }

  async function handleFacebookSuccess(accessToken: string) {
    setError("");
    setLoading(true);
    try {
      await facebookLogin(accessToken);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknown);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: Mode) {
    setError("");
    setSuccess("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setMode(newMode);
  }

  // ── Login ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      if (err?.code === "EMAIL_NOT_VERIFIED") {
        setSuccess(t.auth.emailNotVerified);
        startResendCooldown();
        switchMode("verify-email");
      } else if (err?.code === "USE_GOOGLE_SIGNIN") {
        setError(t.auth.useGoogleSignIn);
      } else {
        setError(err instanceof Error ? err.message : t.errors.unknown);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Register ──
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      trackEmailVerificationSent(email);
      startResendCooldown();
      switchMode("verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknown);
    } finally {
      setLoading(false);
    }
  }

  // ── Verify Email ──
  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmail(email, code);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.invalidCode);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCountdown > 0) return;
    try {
      await resendCode(email);
      trackEmailVerificationSent(email);
      setSuccess(t.auth.codeSent);
      startResendCooldown();
    } catch {
      // silent
    }
  }

  // ── Forgot Password ──
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
    } catch {
      // Always proceed (don't leak email existence)
    } finally {
      startResendCooldown();
      switchMode("reset-password");
      setLoading(false);
    }
  }

  // ── Reset Password ──
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      setMode("login");
      setError("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t.auth.resetSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.invalidCode);
    } finally {
      setLoading(false);
    }
  }

  // ── Masked email for display ──
  function maskedEmail() {
    if (!email.includes("@")) return email;
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `${local}@${domain}`;
    return `${local[0]}${"•".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  return (
    <div className="app">
      <div className="container" style={{ justifyContent: "center", minHeight: "100dvh" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src="/logo-memoo-black.png" alt="Memoo Logo" style={{ width: "100px", height: "100px", margin: "0 auto" }} className="dark:hidden" />
          <img src="/logo-memoo-white.png" alt="Memoo Logo" style={{ width: "100px", height: "100px", margin: "0 auto" }} className="hidden dark:block" />
          <h1 style={{ fontSize: "2.5rem", margin: "-1.0rem 0 0 0", fontWeight: 500 }}>
            {t.menu.title}
          </h1>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            {t.auth.tagline}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>{t.auth.loginTitle}</h2>

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label htmlFor="email" className="small">{t.auth.email}</label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder} required autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="password" className="small">{t.auth.password}</label>
                  <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.auth.passwordPlaceholder} required minLength={6} autoComplete="current-password" />
                </div>
                {error && <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>{error}</div>}
                {success && <div className="badge ok" style={{ alignSelf: "stretch", textAlign: "center" }}>{success}</div>}
                <button type="submit" className="primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1, marginTop: "0.5rem" }}>
                  {loading ? t.common.loading : t.auth.loginButton}
                </button>
              </form>

              {(googleClientId || facebookAppId) && (
                <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                  {googleClientId && (
                    <div style={{ position: "relative", width: 40, height: 40 }}>
                      {/* Visible SVG icon */}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", border: "1px solid var(--color-border)", borderRadius: 4, background: "white" }}>
                        <svg width="20" height="20" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                      {/* Invisible but clickable Google button */}
                      <div style={{ position: "absolute", inset: 0, opacity: 0, overflow: "hidden", cursor: "pointer" }}>
                        <GoogleLogin
                          onSuccess={(response) => {
                            if (response.credential) handleGoogleSuccess(response.credential);
                          }}
                          onError={() => setError(t.auth.googleError)}
                          type="icon"
                          shape="square"
                          size="large"
                        />
                      </div>
                    </div>
                  )}
                  {facebookAppId && (
                    <FacebookLoginButton
                      appId={facebookAppId}
                      onSuccess={handleFacebookSuccess}
                      onError={() => setError(t.auth.facebookError)}
                    />
                  )}
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <button type="button" onClick={() => switchMode("forgot-password")} style={linkStyle}>
                  {t.auth.forgotPassword}
                </button>
              </div>
              <div style={{ textAlign: "center" }}>
                <p className="small">
                  {t.auth.noAccount}{" "}
                  <button type="button" onClick={() => switchMode("register")} style={linkStyle}>{t.auth.register}</button>
                </p>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>{t.auth.registerTitle}</h2>

              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label htmlFor="firstName" className="small">{t.auth.firstName}</label>
                  <input id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t.auth.firstNamePlaceholder} />
                </div>
                <div>
                  <label htmlFor="lastName" className="small">{t.auth.lastName}</label>
                  <input id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t.auth.lastNamePlaceholder} />
                </div>
                <div>
                  <label htmlFor="reg-email" className="small">{t.auth.email}</label>
                  <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder} required autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="reg-password" className="small">{t.auth.password}</label>
                  <input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.auth.passwordPlaceholder} required minLength={6} autoComplete="new-password" />
                </div>
                {error && <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>{error}</div>}
                <button type="submit" className="primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1, marginTop: "0.5rem" }}>
                  {loading ? t.common.loading : t.auth.registerButton}
                </button>
              </form>

              {(googleClientId || facebookAppId) && (
                <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                  {googleClientId && (
                    <div style={{ position: "relative", width: 40, height: 40 }}>
                      {/* Visible SVG icon */}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", border: "1px solid var(--color-border)", borderRadius: 4, background: "white" }}>
                        <svg width="20" height="20" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                      {/* Invisible but clickable Google button */}
                      <div style={{ position: "absolute", inset: 0, opacity: 0, overflow: "hidden", cursor: "pointer" }}>
                        <GoogleLogin
                          onSuccess={(response) => {
                            if (response.credential) handleGoogleSuccess(response.credential);
                          }}
                          onError={() => setError(t.auth.googleError)}
                          type="icon"
                          shape="square"
                          size="large"
                        />
                      </div>
                    </div>
                  )}
                  {facebookAppId && (
                    <FacebookLoginButton
                      appId={facebookAppId}
                      onSuccess={handleFacebookSuccess}
                      onError={() => setError(t.auth.facebookError)}
                    />
                  )}
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <p className="small">
                  {t.auth.alreadyAccount}{" "}
                  <button type="button" onClick={() => switchMode("login")} style={linkStyle}>{t.auth.login}</button>
                </p>
              </div>
            </>
          )}

          {/* ── VERIFY EMAIL ── */}
          {mode === "verify-email" && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>{t.auth.verifyEmailTitle}</h2>
              <p className="small" style={{ textAlign: "center" }}>
                {t.auth.verifyEmailSubtitle} <strong>{maskedEmail()}</strong>
              </p>
              <form onSubmit={handleVerifyEmail} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label htmlFor="code" className="small">{t.auth.enterCode}</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                  />
                </div>
                {error && <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>{error}</div>}
                {success && (
                  <>
                    <div className="badge ok" style={{ alignSelf: "stretch", textAlign: "center" }}>{success}</div>
                    <p className="small" style={{ textAlign: "center", color: "var(--color-text-secondary, #888)", margin: "0", lineHeight: "1.4" }}>
                      {t.auth.checkSpamHint}
                    </p>
                  </>
                )}
                <button type="submit" className="primary" disabled={loading || code.length !== 6} style={{ opacity: loading || code.length !== 6 ? 0.7 : 1, marginTop: "0.5rem" }}>
                  {loading ? t.common.loading : t.auth.verifyButton}
                </button>
              </form>
              <div style={{ textAlign: "center" }}>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCountdown > 0}
                  style={{ ...linkStyle, opacity: resendCountdown > 0 ? 0.5 : 1 }}
                >
                  {resendCountdown > 0 ? t.auth.resendIn(resendCountdown) : t.auth.resendCode}
                </button>
              </div>
              <div style={{ textAlign: "center" }}>
                <button type="button" onClick={() => switchMode("login")} style={linkStyle}>
                  {t.auth.backToLogin}
                </button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot-password" && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>{t.auth.forgotPasswordTitle}</h2>
              <p className="small" style={{ textAlign: "center" }}>{t.auth.forgotPasswordSubtitle}</p>
              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label htmlFor="forgot-email" className="small">{t.auth.email}</label>
                  <input id="forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.auth.emailPlaceholder} required autoComplete="email" />
                </div>
                {error && <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>{error}</div>}
                <button type="submit" className="primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1, marginTop: "0.5rem" }}>
                  {loading ? t.common.loading : t.auth.sendCode}
                </button>
              </form>
              <div style={{ textAlign: "center" }}>
                <button type="button" onClick={() => switchMode("login")} style={linkStyle}>
                  {t.auth.backToLogin}
                </button>
              </div>
            </>
          )}

          {/* ── RESET PASSWORD ── */}
          {mode === "reset-password" && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>{t.auth.resetPasswordTitle}</h2>
              <p className="small" style={{ textAlign: "center" }}>
                {t.auth.verifyEmailSubtitle} <strong>{maskedEmail()}</strong>
              </p>
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label htmlFor="reset-code" className="small">{t.auth.enterCode}</label>
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="small">{t.auth.newPasswordLabel}</label>
                  <input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t.auth.passwordPlaceholder} required minLength={6} autoComplete="new-password" />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="small">{t.auth.confirmPasswordLabel}</label>
                  <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t.auth.passwordPlaceholder} required minLength={6} autoComplete="new-password" />
                </div>
                {error && <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>{error}</div>}
                <button type="submit" className="primary" disabled={loading || code.length !== 6} style={{ opacity: loading || code.length !== 6 ? 0.7 : 1, marginTop: "0.5rem" }}>
                  {loading ? t.common.loading : t.auth.resetButton}
                </button>
              </form>
              <div style={{ textAlign: "center" }}>
                <button type="button" onClick={() => switchMode("login")} style={linkStyle}>
                  {t.auth.backToLogin}
                </button>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <p className="small" style={{ textAlign: "center", marginTop: "1rem" }}>
          {t.auth.footerText}
        </p>
      </div>
    </div>
  );
}
