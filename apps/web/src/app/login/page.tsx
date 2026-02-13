"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { t } from "../../lib/i18n";
import { useLanguage } from "../../hooks/useLanguage";

export default function LoginPage() {
  useLanguage(); // Force re-render on language change
  const router = useRouter();
  const { user, loading: authLoading, login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in → redirect to home
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  if (!authLoading && user) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, firstName, lastName);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknown);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="container" style={{ justifyContent: "center", minHeight: "100dvh" }}>
        {/* Logo / App Name */}
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

        {/* Login Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>
            {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {mode === "register" && (
              <>
                <div>
                  <label htmlFor="firstName" className="small">{t.auth.firstName}</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t.auth.firstNamePlaceholder}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="small">{t.auth.lastName}</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t.auth.lastNamePlaceholder}
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="small">{t.auth.email}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="small">{t.auth.password}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, marginTop: "0.5rem" }}
            >
              {loading
                ? t.common.loading
                : mode === "login"
                ? t.auth.loginButton
                : t.auth.registerButton}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            {mode === "login" ? (
              <p className="small">
                {t.auth.noAccount}{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  style={{
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
                  }}
                >
                  {t.auth.register}
                </button>
              </p>
            ) : (
              <p className="small">
                {t.auth.alreadyAccount}{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  style={{
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
                  }}
                >
                  {t.auth.login}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="small" style={{ textAlign: "center", marginTop: "1rem" }}>
          {t.auth.footerText}
        </p>
      </div>
    </div>
  );
}
