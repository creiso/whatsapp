import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { expoPushToken: token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
