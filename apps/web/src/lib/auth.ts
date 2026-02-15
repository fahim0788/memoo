const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const TOKEN_KEY = "auth_token";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
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
  document.cookie = `has_token=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = "has_token=; path=/; max-age=0";
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse & { error?: string }> {
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
    // Special case: email not verified — caller handles the redirect
    if (data.error === "email_not_verified") {
      throw Object.assign(new Error("email_not_verified"), { code: "EMAIL_NOT_VERIFIED" });
    }
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
): Promise<{ ok: boolean; requiresVerification?: boolean }> {
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

  return r.json();
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

export type UpdateProfileData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
};

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("Non authentifié");

  const r = await fetch(`${API_BASE}/auth/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const messages: Record<string, string> = {
      "current password required": "Mot de passe actuel requis",
      "invalid password": "Mot de passe actuel incorrect",
      "email already registered": "Cet email est déjà utilisé",
      "no changes": "Aucune modification",
    };
    throw new Error(messages[err.error] || err.error || "Erreur lors de la mise à jour");
  }

  const result = await r.json();
  return result.user;
}

export function logout(): void {
  clearToken();
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  const r = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || "Code invalide");
  }

  const data = await r.json();
  setToken(data.token);
  return data;
}

export async function resendCode(email: string): Promise<void> {
  await fetch(`${API_BASE}/auth/resend-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const r = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });

  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || "Code invalide");
  }
}
