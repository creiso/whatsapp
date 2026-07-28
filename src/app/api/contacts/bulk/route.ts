import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const contacts = await req.json();
    
    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
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
        },
        create: {
          phone: contact.phone,
          name: contact.name || null,
          attributes: attrsStr,
          status: 'ACTIVE',
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
