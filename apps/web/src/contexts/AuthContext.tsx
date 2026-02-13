"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getMe,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  updateProfile as authUpdateProfile,
  type User,
  type UpdateProfileData,
} from "../lib/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        // Sync cookie with actual auth state (handles existing tokens without cookie)
        if (u) {
          document.cookie = `has_token=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        } else {
          document.cookie = "has_token=; path=/; max-age=0";
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await authLogin(email, password);
    setUser(result.user);
  }

  async function register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) {
    const result = await authRegister(email, password, firstName, lastName);
    setUser(result.user);
  }

  async function updateProfile(data: UpdateProfileData) {
    const updated = await authUpdateProfile(data);
    setUser(updated);
  }

  function logout() {
    authLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
