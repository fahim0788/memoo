import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@memolist/db';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key-change-me-in-production-min32chars');

async function verifyAdminAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    const verified = await jwtVerify(token, secret);
    const userId = verified.payload.userId as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return { error: 'Forbidden', status: 403 };
    }

    return { user, error: null };
  } catch (err) {
    return { error: 'Unauthorized', status: 401 };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const auth = await verifyAdminAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const sort = (url.searchParams.get('sort') as 'asc' | 'desc') || 'desc';
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const requests = await prisma.certificationRequest.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: sort },
    });

    const total = await prisma.certificationRequest.count();

    return NextResponse.json({
      requests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('Fetch requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
