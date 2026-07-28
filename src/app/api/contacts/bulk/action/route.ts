import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ids, teamId } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (action === "DELETE") {
      await prisma.contact.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ success: true, count: ids.length });
    } else if (action === "MOVE") {
      if (!teamId) return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
      await prisma.contact.updateMany({
        where: { id: { in: ids } },
        data: { teamId },
      });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
  }
}
