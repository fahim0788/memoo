import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { makeRequest, jsonBody } from "./helpers";

// Must import route AFTER mocks are set up
import { GET } from "../../app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  it("returns ok when database is reachable", async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const req = makeRequest("http://localhost:3001/api/health");
    const res = await GET(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.db).toBe(true);
    expect(data.time).toBeTypeOf("number");
  });

  it("returns 503 when database is unreachable", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

    const req = makeRequest("http://localhost:3001/api/health");
    const res = await GET(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.db).toBe(false);
    expect(data.error).toBe("database unreachable");
  });
});
