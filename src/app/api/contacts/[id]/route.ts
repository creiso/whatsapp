import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { teamId, lockedById } = await req.json();
    const resolvedParams = await params;

    const contact = await prisma.contact.update({
      where: { id: resolvedParams.id },
      data: { teamId: teamId === "" ? null : teamId }
    });

    if (lockedById !== undefined) {
      await prisma.conversation.updateMany({
        where: { contactId: resolvedParams.id, status: 'OPEN' },
        data: { lockedById: lockedById === "" ? null : lockedById }
      });
    }

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error("Error updating contact:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
