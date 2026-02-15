import { NextRequest } from "next/server";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key-for-vitest";

export function createToken(userId = "user-1", email = "test@test.com") {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "1h" });
}

export function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, token, headers = {} } = options;

  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...headers,
    },
  };

  if (token) {
    init.headers.authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3001"), init);
}

export async function jsonBody(res: Response) {
  return res.json();
}

export function authedRequest(
  url: string,
  options: Omit<Parameters<typeof makeRequest>[1], "token"> & { userId?: string; email?: string } = {},
) {
  const { userId, email, ...rest } = options;
  return makeRequest(url, { ...rest, token: createToken(userId, email) });
}
