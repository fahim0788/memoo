import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract userId from JWT Bearer token
 * Decodes base64 payload without signature verification (acceptable for tracking)
 */
function extractUserIdFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;

    // Decode base64url to string
    const payload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    );
    return payload?.userId || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, type, category, action, metadata } = body;

    // Validate required fields
    if (!sessionId || !type || !category) {
      return NextResponse.json({}, { status: 400 });
    }

    // Dynamic import to avoid bundling issues
    const pg = await import('pg');
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://memolist:memolist@localhost:5432/memolist',
    });

    const client = await pool.connect();

    // Extract userId from token if authenticated
    const userId = extractUserIdFromToken(request);

    // Insert event using raw SQL (gen_random_uuid generates UUID instead of CUID, but works fine for IDs)
    await client.query(
      `INSERT INTO "Event" (id, "userId", "sessionId", type, category, action, status, metadata, "createdAt")
       VALUES (gen_random_uuid()::text, $6, $1, $2, $3, $4, 'success', $5, NOW())`,
      [sessionId, type, category, action || null, JSON.stringify(metadata || {}), userId]
    );

    client.release();
    await pool.end();

    // Return 201 Created silently (fire-and-forget pattern)
    return NextResponse.json({}, { status: 201 });
  } catch (err) {
    // Log error for debugging
    console.warn('Event tracking error:', err);
    // Return error in response for debugging (should be removed in prod)
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 200 });
  }
}
