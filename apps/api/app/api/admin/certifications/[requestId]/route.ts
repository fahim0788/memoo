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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    // Verify admin auth
    const auth = await verifyAdminAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { requestId } = params;

    const certRequest = await prisma.certificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!certRequest) {
      return NextResponse.json(
        { error: 'Certification request not found' },
        { status: 404 }
      );
    }

    // Delete the request
    await prisma.certificationRequest.delete({
      where: { id: requestId },
    });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
