import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { makeRequest, authedRequest, jsonBody } from "./helpers";

import { POST as pushReviews } from "../../app/api/sync/push/route";
import { GET as pullSync } from "../../app/api/sync/pull/route";

describe("POST /api/sync/push", () => {
  beforeEach(() => {
    prisma.review.createMany.mockReset();
  });

  it("pushes reviews successfully", async () => {
    prisma.review.createMany.mockResolvedValue({ count: 2 });

    const req = authedRequest("http://localhost:3001/api/sync/push", {
      method: "POST",
      body: {
        reviews: [
          { cardId: "card-1", ok: true, userAnswer: "hello" },
          { cardId: "card-2", ok: false, userAnswer: "wrong" },
        ],
      },
    });
    const res = await pushReviews(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.created).toBe(2);
    expect(data.serverTime).toBeTypeOf("number");
  });

  it("rejects empty reviews (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/sync/push", {
      method: "POST",
      body: { reviews: [] },
    });
    const res = await pushReviews(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });

  it("rejects unauthenticated request", async () => {
    const req = makeRequest("http://localhost:3001/api/sync/push", {
      method: "POST",
      body: { reviews: [{ cardId: "c1", ok: true }] },
    });
    const res = await pushReviews(req);

    expect(res.status).toBe(401);
  });

  it("accepts reviews with reviewedAt timestamp", async () => {
    prisma.review.createMany.mockResolvedValue({ count: 1 });

    const req = authedRequest("http://localhost:3001/api/sync/push", {
      method: "POST",
      body: {
        reviews: [
          { cardId: "card-1", ok: true, reviewedAt: Date.now() },
        ],
      },
    });
    const res = await pushReviews(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

describe("GET /api/sync/pull", () => {
  it("returns serverTime", async () => {
    const req = authedRequest("http://localhost:3001/api/sync/pull");
    const res = await pullSync(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.serverTime).toBeTypeOf("number");
  });

  it("rejects unauthenticated request", async () => {
    const req = makeRequest("http://localhost:3001/api/sync/pull");
    const res = await pullSync(req);

    expect(res.status).toBe(401);
  });
});
