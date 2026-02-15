import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { makeRequest, authedRequest, jsonBody, createToken } from "./helpers";

import { POST as login } from "../../app/api/auth/login/route";
import { POST as register } from "../../app/api/auth/register/route";
import { GET as getMe, PUT as updateMe } from "../../app/api/auth/me/route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
  });

  it("returns token on valid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      password: "hashed:secret123",
      firstName: "Test",
      lastName: "User",
      isActive: true,
    });

    const req = makeRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { email: "test@test.com", password: "secret123" },
    });
    const res = await login(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.token).toBeTypeOf("string");
    expect(data.user.email).toBe("test@test.com");
  });

  it("rejects invalid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { email: "bad@test.com", password: "wrong" },
    });
    const res = await login(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(401);
    expect(data.error).toBe("invalid credentials");
  });

  it("rejects disabled account", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "disabled@test.com",
      password: "hashed:secret123",
      isActive: false,
    });

    const req = makeRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { email: "disabled@test.com", password: "secret123" },
    });
    const res = await login(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(403);
    expect(data.error).toBe("account disabled");
  });

  it("rejects invalid email format (Zod)", async () => {
    const req = makeRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { email: "not-an-email", password: "secret123" },
    });
    const res = await login(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });

  it("rejects missing password (Zod)", async () => {
    const req = makeRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { email: "test@test.com" },
    });
    const res = await login(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.create.mockReset();
  });

  it("creates a new user and returns token", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-new",
      email: "new@test.com",
      firstName: "New",
      lastName: "User",
    });

    const req = makeRequest("http://localhost:3001/api/auth/register", {
      method: "POST",
      body: { email: "new@test.com", password: "secret123", firstName: "New", lastName: "User" },
    });
    const res = await register(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.token).toBeTypeOf("string");
    expect(data.user.email).toBe("new@test.com");
  });

  it("rejects duplicate email", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const req = makeRequest("http://localhost:3001/api/auth/register", {
      method: "POST",
      body: { email: "existing@test.com", password: "secret123" },
    });
    const res = await register(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(409);
    expect(data.error).toBe("email already registered");
  });

  it("rejects short password (Zod)", async () => {
    const req = makeRequest("http://localhost:3001/api/auth/register", {
      method: "POST",
      body: { email: "test@test.com", password: "ab" },
    });
    const res = await register(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
  });

  it("returns user profile with valid token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
      isActive: true,
      createdAt: new Date("2025-01-01"),
    });

    const req = authedRequest("http://localhost:3001/api/auth/me");
    const res = await getMe(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.user.email).toBe("test@test.com");
  });

  it("rejects unauthenticated request", async () => {
    const req = makeRequest("http://localhost:3001/api/auth/me");
    const res = await getMe(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(401);
    expect(data.error).toBe("unauthorized");
  });

  it("rejects invalid token", async () => {
    const req = makeRequest("http://localhost:3001/api/auth/me", {
      token: "invalid-token",
    });
    const res = await getMe(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(401);
    expect(data.error).toBe("unauthorized");
  });
});

describe("PUT /api/auth/me", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
  });

  it("updates firstName and lastName", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      password: "hashed:secret",
      firstName: "Old",
      lastName: "Name",
    });
    prisma.user.update.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      firstName: "New",
      lastName: "Name",
      isActive: true,
      createdAt: new Date(),
    });

    const req = authedRequest("http://localhost:3001/api/auth/me", {
      method: "PUT",
      body: { firstName: "New" },
    });
    const res = await updateMe(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.user.firstName).toBe("New");
  });

  it("rejects email change without current password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "old@test.com",
      password: "hashed:secret",
    });

    const req = authedRequest("http://localhost:3001/api/auth/me", {
      method: "PUT",
      body: { email: "new@test.com" },
    });
    const res = await updateMe(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("current password required");
  });

  it("rejects password change with wrong current password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      password: "hashed:correct",
    });

    const req = authedRequest("http://localhost:3001/api/auth/me", {
      method: "PUT",
      body: { currentPassword: "wrong", newPassword: "newpass123" },
    });
    const res = await updateMe(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(403);
    expect(data.error).toBe("invalid password");
  });
});
