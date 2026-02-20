import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');

    // Dynamic import to avoid bundling issues
    const pg = await import('pg');
    const Pool = pg.Pool;

    // Use environment variable with fallback for local development
    const dbUrl = process.env.DATABASE_URL || 'postgresql://memolist:memolist@localhost:5432/memolist';

    const pool = new Pool({
      connectionString: dbUrl,
    });

    const client = await pool.connect();
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const eventsResult = await client.query(
      `SELECT e.*,
              json_build_object('id', u.id, 'email', u.email, 'firstName', u."firstName", 'lastName', u."lastName") as "user"
       FROM "Event" e
       LEFT JOIN "User" u ON e."userId" = u.id
       ORDER BY e."createdAt" DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    const countResult = await client.query('SELECT COUNT(*) FROM "Event"');
    const total = parseInt(countResult.rows[0].count);

    client.release();
    await pool.end();

    return NextResponse.json({
      events: eventsResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('Events API error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
