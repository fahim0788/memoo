import { NextRequest, NextResponse } from "next/server";
import { CORS_ORIGIN } from "./config";

export function withCors(res: NextResponse, origin?: string | null) {
  if (origin === CORS_ORIGIN || origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
    res.headers.set("Access-Control-Allow-Origin", origin || CORS_ORIGIN);
  }

  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}

export function json(data: unknown, req: NextRequest, status = 200) {
  return withCors(
    NextResponse.json(data, { status }),
    req.headers.get("origin")
  );
}

export async function OPTIONS(req: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), req.headers.get("origin"));
}
