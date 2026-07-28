import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const lists = await prisma.contactList.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contacts: true } },
        team: { select: { id: true, name: true } },
      }
    });
    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}
