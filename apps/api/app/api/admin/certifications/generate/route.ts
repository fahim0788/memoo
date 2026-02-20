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

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const auth = await verifyAdminAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { certCode } = await request.json();
    if (!certCode) {
      return NextResponse.json(
        { error: 'certCode is required' },
        { status: 400 }
      );
    }

    // Check if certification already exists
    const existing = await prisma.certificationRequest.findUnique({
      where: { certCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Certification already exists', requestId: existing.id },
        { status: 409 }
      );
    }

    // Create certification request
    const certRequest = await prisma.certificationRequest.create({
      data: {
        adminId: (auth.user as any).id,
        certCode,
        status: 'pending',
        metadata: {
          startedAt: new Date().toISOString(),
          initialStatus: 'pending',
        },
      },
    });

    // TODO: Trigger generation service (async job)
    return NextResponse.json(
      {
        requestId: certRequest.id,
        message: 'Generation queued. Check status in Requests tab.',
      },
      { status: 202 }
    );
  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
