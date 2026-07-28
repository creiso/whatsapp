import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { teamId } = await req.json();

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: { teamId: teamId === "" ? null : teamId }
    });

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error("Error updating contact:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
