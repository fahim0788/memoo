const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const TOKEN_KEY = "auth_token";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type AuthResponse = {
  ok: boolean;
  token: string;
  user: User;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    if (r.status === 0 || !navigator.onLine) {
      throw new Error("Vous êtes hors ligne. Vérifiez votre connexion internet.");
    }
    const data = await r.json().catch(() => ({}));
    const messages: Record<string, string> = {
      "invalid credentials": "Email ou mot de passe incorrect",
      "account disabled": "Ce compte a été désactivé",
      "email and password required": "Email et mot de passe requis",
    };
    throw new Error(messages[data.error] || data.error || "Impossible de se connecter");
  }

  const data = await r.json();
  setToken(data.token);
  return data;
}

export async function register(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<AuthResponse> {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });

  if (!r.ok) {
    if (r.status === 0 || !navigator.onLine) {
      throw new Error("Vous êtes hors ligne. Vérifiez votre connexion internet.");
    }
    const data = await r.json().catch(() => ({}));
    const messages: Record<string, string> = {
      "email already registered": "Cet email est déjà utilisé",
      "email and password required": "Email et mot de passe requis",
    };
    throw new Error(messages[data.error] || data.error || "Impossible de créer le compte");
  }

  const data = await r.json();
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  const r = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!r.ok) {
    if (r.status === 401) {
      clearToken();
    }
    return null;
  }

  const data = await r.json();
  return data.user;
}

export function logout(): void {
  clearToken();
}
