import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function createRequest(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

describe("middleware", () => {
  describe("unauthenticated user", () => {
    it("redirects / to /login", () => {
      const res = middleware(createRequest("/"));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    });

    it("redirects /unknown-page to /login", () => {
      const res = middleware(createRequest("/unknown-page"));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    });

    it("allows /login without redirect", () => {
      const res = middleware(createRequest("/login"));
      expect(res.headers.get("location")).toBeNull();
    });
  });

  describe("authenticated user", () => {
    it("allows / without redirect", () => {
      const res = middleware(createRequest("/", { has_token: "1" }));
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects /login to /", () => {
      const res = middleware(createRequest("/login", { has_token: "1" }));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    });
  });
});
