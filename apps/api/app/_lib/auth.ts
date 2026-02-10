import { NextRequest } from "next/server";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./config";
import { json } from "./cors";

export type JwtPayload = {
  userId: string;
  email: string;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

export function requireAuth(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return { error: json({ error: "unauthorized" }, req, 401) };
  }
  return { user };
}
