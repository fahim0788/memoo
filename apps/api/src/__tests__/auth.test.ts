import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { makeRequest, authedRequest, jsonBody } from "./helpers";

import { POST as login } from "../../app/api/auth/login/route";
import { POST as register } from "../../app/api/auth/register/route";
import { GET as getMe, PUT as updateMe } from "../../app/api/auth/me/route";
import { POST as verifyEmail } from "../../app/api/auth/verify-email/route";
import { POST as resendCode } from "../../app/api/auth/resend-code/route";
import { POST as forgotPassword } from "../../app/api/auth/forgot-password/route";
import { POST as resetPassword } from "../../app/api/auth/reset-password/route";

// ── Login ──

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
  });

  it("returns token on valid credentials (verified email)", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      password: "hashed:secret123",
      firstName: "Test",
      lastName: "User",
      isActive: true,
      emailVerified: true,
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

  it("rejects unverified email with 403", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "unverified@test.com",
      password: "hashed:secret123",
      isActive: true,
      emailVerified: false,
    });
    prisma.user.update.mockResolvedValue({});

    const req = makeRequest("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { email: "unverified@test.com", password: "secret123" },
    });
    const res = await login(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(403);
    expect(data.error).toBe("email_not_verified");
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
});

// ── Register ──

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.create.mockReset();
  });

  it("creates user and returns requiresVerification (no token)", async () => {
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
    expect(data.requiresVerification).toBe(true);
    expect(data.token).toBeUndefined();
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

// ── Verify Email ──

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
  });

  it("verifies email with valid code and returns token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
      emailVerified: false,
      verificationCode: "123456",
      verificationCodeExpiresAt: new Date(Date.now() + 10 * 60_000),
    });
    prisma.user.update.mockResolvedValue({});

    const req = makeRequest("http://localhost:3001/api/auth/verify-email", {
      method: "POST",
      body: { email: "test@test.com", code: "123456" },
    });
    const res = await verifyEmail(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.token).toBeTypeOf("string");
    expect(data.user.email).toBe("test@test.com");
  });

  it("rejects wrong code", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      emailVerified: false,
      verificationCode: "123456",
      verificationCodeExpiresAt: new Date(Date.now() + 10 * 60_000),
    });

    const req = makeRequest("http://localhost:3001/api/auth/verify-email", {
      method: "POST",
      body: { email: "test@test.com", code: "000000" },
    });
    const res = await verifyEmail(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid code");
  });

  it("rejects expired code", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      emailVerified: false,
      verificationCode: "123456",
      verificationCodeExpiresAt: new Date(Date.now() - 60_000), // expired
    });

    const req = makeRequest("http://localhost:3001/api/auth/verify-email", {
      method: "POST",
      body: { email: "test@test.com", code: "123456" },
    });
    const res = await verifyEmail(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid code");
  });

  it("rejects already verified email", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      emailVerified: true,
    });

    const req = makeRequest("http://localhost:3001/api/auth/verify-email", {
      method: "POST",
      body: { email: "test@test.com", code: "123456" },
    });
    const res = await verifyEmail(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("already verified");
  });
});

// ── Resend Code ──

describe("POST /api/auth/resend-code", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
  });

  it("returns ok for existing unverified user", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      emailVerified: false,
    });
    prisma.user.update.mockResolvedValue({});

    const req = makeRequest("http://localhost:3001/api/auth/resend-code", {
      method: "POST",
      body: { email: "test@test.com" },
    });
    const res = await resendCode(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns ok for non-existent email (no leaking)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3001/api/auth/resend-code", {
      method: "POST",
      body: { email: "nobody@test.com" },
    });
    const res = await resendCode(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns ok for already verified user (no action)", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      emailVerified: true,
    });

    const req = makeRequest("http://localhost:3001/api/auth/resend-code", {
      method: "POST",
      body: { email: "test@test.com" },
    });
    const res = await resendCode(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    // Should NOT call update for verified users
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

// ── Forgot Password ──

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
  });

  it("returns ok and sends code for existing user", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
    });
    prisma.user.update.mockResolvedValue({});

    const req = makeRequest("http://localhost:3001/api/auth/forgot-password", {
      method: "POST",
      body: { email: "test@test.com" },
    });
    const res = await forgotPassword(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("returns ok for non-existent email (no leaking)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3001/api/auth/forgot-password", {
      method: "POST",
      body: { email: "nobody@test.com" },
    });
    const res = await forgotPassword(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

// ── Reset Password ──

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
  });

  it("resets password with valid code", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      verificationCode: "654321",
      verificationCodeExpiresAt: new Date(Date.now() + 10 * 60_000),
    });
    prisma.user.update.mockResolvedValue({});

    const req = makeRequest("http://localhost:3001/api/auth/reset-password", {
      method: "POST",
      body: { email: "test@test.com", code: "654321", newPassword: "newpass123" },
    });
    const res = await resetPassword(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: "hashed:newpass123",
          verificationCode: null,
          verificationCodeExpiresAt: null,
        }),
      }),
    );
  });

  it("rejects wrong code", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      verificationCode: "654321",
      verificationCodeExpiresAt: new Date(Date.now() + 10 * 60_000),
    });

    const req = makeRequest("http://localhost:3001/api/auth/reset-password", {
      method: "POST",
      body: { email: "test@test.com", code: "000000", newPassword: "newpass123" },
    });
    const res = await resetPassword(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid code");
  });

  it("rejects expired code", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      verificationCode: "654321",
      verificationCodeExpiresAt: new Date(Date.now() - 60_000),
    });

    const req = makeRequest("http://localhost:3001/api/auth/reset-password", {
      method: "POST",
      body: { email: "test@test.com", code: "654321", newPassword: "newpass123" },
    });
    const res = await resetPassword(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid code");
  });

  it("rejects short password (Zod)", async () => {
    const req = makeRequest("http://localhost:3001/api/auth/reset-password", {
      method: "POST",
      body: { email: "test@test.com", code: "654321", newPassword: "ab" },
    });
    const res = await resetPassword(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});

// ── GET/PUT /api/auth/me ──

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
