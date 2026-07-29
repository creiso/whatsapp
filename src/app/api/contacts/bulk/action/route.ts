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
      const targetListId = body.listId;
      if (!targetListId) return NextResponse.json({ error: "Missing listId" }, { status: 400 });
      
      const targetList = await prisma.contactList.findUnique({ where: { id: targetListId } });
      if (!targetList) return NextResponse.json({ error: "List not found" }, { status: 404 });

      const operations = ids.map((id: string) => prisma.contact.update({
        where: { id },
        data: { 
          teamId: targetList.teamId,
          lists: { set: [{ id: targetListId }] }
        }
      }));
      
      await prisma.$transaction(operations);

      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
  }
}
