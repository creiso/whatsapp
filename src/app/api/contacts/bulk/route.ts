import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listName, contacts, teamId } = body;
    
    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: "Invalid payload format. Expected { listName?: string, contacts: any[], teamId?: string }" }, { status: 400 });
    }

    let list = null;
    if (listName) {
      list = await prisma.contactList.upsert({
        where: { name: listName },
        update: {
          ...(teamId ? { teamId } : {})
        },
        create: { 
          name: listName,
          ...(teamId ? { teamId } : {})
        },
      });
    }

    let imported = 0;
    for (const contact of contacts) {
      if (!contact.phone) continue;

      const attrsStr = contact.attributes && Object.keys(contact.attributes).length > 0 
        ? JSON.stringify(contact.attributes) 
        : null;

      await prisma.contact.upsert({
        where: { phone: contact.phone },
        update: {
          name: contact.name || undefined,
          attributes: attrsStr || undefined,
          ...(teamId ? { teamId } : {}),
          ...(list ? { lists: { connect: { id: list.id } } } : {}),
        },
        create: {
          phone: contact.phone,
          name: contact.name || null,
          attributes: attrsStr,
          status: 'ACTIVE',
          ...(teamId ? { teamId } : {}),
          ...(list ? { lists: { connect: { id: list.id } } } : {}),
        },
      });
      imported++;
    }

    return NextResponse.json({ imported });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Failed to import contacts" }, { status: 500 });
  }
}
