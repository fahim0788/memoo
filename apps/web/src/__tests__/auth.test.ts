import { describe, it, expect, vi, beforeEach } from "vitest";
import { getToken, setToken, clearToken, logout } from "../lib/auth";

describe("auth", () => {
  describe("getToken", () => {
    it("returns null when no token stored", () => {
      expect(getToken()).toBeNull();
    });

    it("returns stored token", () => {
      localStorage.setItem("auth_token", "my-secret-token");
      expect(getToken()).toBe("my-secret-token");
    });
  });

  describe("setToken", () => {
    it("stores token in localStorage", () => {
      setToken("abc123");
      expect(localStorage.getItem("auth_token")).toBe("abc123");
    });

    it("overwrites existing token", () => {
      setToken("old-token");
      setToken("new-token");
      expect(localStorage.getItem("auth_token")).toBe("new-token");
    });

    it("sets has_token cookie", () => {
      setToken("abc123");
      expect(document.cookie).toContain("has_token=1");
    });
  });

  describe("clearToken", () => {
    it("removes token from localStorage", () => {
      setToken("token-to-remove");
      clearToken();
      expect(localStorage.getItem("auth_token")).toBeNull();
    });

    it("removes has_token cookie", () => {
      setToken("some-token");
      clearToken();
      expect(document.cookie).not.toContain("has_token=1");
    });

    it("does not throw if no token exists", () => {
      expect(() => clearToken()).not.toThrow();
    });
  });

  describe("logout", () => {
    it("clears the token", () => {
      setToken("session-token");
      logout();
      expect(getToken()).toBeNull();
    });
  });

  describe("login", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("stores token on successful login", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          token: "jwt-token-123",
          user: { id: "u1", email: "test@test.com", firstName: "John", lastName: "Doe" },
        }),
      }));

      const { login } = await import("../lib/auth");
      const result = await login("test@test.com", "password");
      expect(result.token).toBe("jwt-token-123");
      expect(localStorage.getItem("auth_token")).toBe("jwt-token-123");
    });

    it("throws on invalid credentials", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "invalid credentials" }),
      }));

      const { login } = await import("../lib/auth");
      await expect(login("bad@test.com", "wrong")).rejects.toThrow("Email ou mot de passe incorrect");
    });

    it("throws offline message when offline", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 0,
      }));
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });

      const { login } = await import("../lib/auth");
      await expect(login("a@b.com", "p")).rejects.toThrow("hors ligne");

      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    });
  });

  describe("register", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("stores token on successful registration", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          token: "new-user-token",
          user: { id: "u2", email: "new@test.com", firstName: "Jane", lastName: "Doe" },
        }),
      }));

      const { register } = await import("../lib/auth");
      const result = await register("new@test.com", "password", "Jane", "Doe");
      expect(result.token).toBe("new-user-token");
      expect(localStorage.getItem("auth_token")).toBe("new-user-token");
    });

    it("throws on duplicate email", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: "email already registered" }),
      }));

      const { register } = await import("../lib/auth");
      await expect(register("dup@test.com", "pass")).rejects.toThrow("déjà utilisé");
    });
  });

  describe("getMe", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("returns user when authenticated", async () => {
      localStorage.setItem("auth_token", "valid-token");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          user: { id: "u1", email: "me@test.com", firstName: "Me", lastName: "User" },
        }),
      }));

      const { getMe } = await import("../lib/auth");
      const user = await getMe();
      expect(user).not.toBeNull();
      expect(user!.email).toBe("me@test.com");
    });

    it("returns null when no token", async () => {
      const { getMe } = await import("../lib/auth");
      const user = await getMe();
      expect(user).toBeNull();
    });

    it("clears token and returns null on 401", async () => {
      localStorage.setItem("auth_token", "expired-token");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }));

      const { getMe } = await import("../lib/auth");
      const user = await getMe();
      expect(user).toBeNull();
      expect(localStorage.getItem("auth_token")).toBeNull();
    });
  });
});
