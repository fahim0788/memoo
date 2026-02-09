"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
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
          <h1 style={{ fontSize: "2.5rem", margin: 0, fontWeight: 800 }}>
            Memoo
          </h1>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            Apprends par repetition espacee
          </p>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 style={{ margin: 0, fontSize: "1.25rem", textAlign: "center" }}>
            {mode === "login" ? "Connexion" : "Creer un compte"}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {mode === "register" && (
              <>
                <div>
                  <label htmlFor="firstName" className="small">Prenom</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="small">Nom</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="small">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@exemple.fr"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="small">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                ? "Chargement..."
                : mode === "login"
                ? "Se connecter"
                : "Creer mon compte"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            {mode === "login" ? (
              <p className="small">
                Pas encore de compte ?{" "}
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
                  Inscription
                </button>
              </p>
            ) : (
              <p className="small">
                Deja inscrit ?{" "}
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
                  Connexion
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="small" style={{ textAlign: "center", marginTop: "1rem" }}>
            Leçons populaires ou créez les votre avec vos propres cartes mémoire !
        </p>
      </div>
    </div>
  );
}
