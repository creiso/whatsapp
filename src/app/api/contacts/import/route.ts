import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

    if (lines.length < 2) {
      return NextResponse.json({ error: "File must have headers and at least one row of data" }, { status: 400 });
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // Find key columns
    const phoneIndex = headers.findIndex(h => h === "telefone" || h === "phone" || h === "celular");
    const nameIndex = headers.findIndex(h => h === "nome" || h === "name");

    if (phoneIndex === -1) {
      return NextResponse.json({ error: "Could not find a phone column (expected 'telefone', 'phone', or 'celular')" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      
      const phone = values[phoneIndex];
      if (!phone) {
        skipped++;
        continue;
      }

      const name = nameIndex !== -1 ? values[nameIndex] : undefined;

      const attributes: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index !== phoneIndex && index !== nameIndex && values[index]) {
          attributes[header] = values[index];
        }
      });

      try {
        await prisma.contact.create({
          data: {
            phone,
            name,
            attributes: Object.keys(attributes).length > 0 ? JSON.stringify(attributes) : null,
          }
        });
        imported++;
      } catch (err: any) {
        // P2002 is Prisma's unique constraint violation code
        if (err.code === 'P2002') {
          skipped++;
        } else {
          console.error(`Error importing row ${i + 1}:`, err);
          skipped++;
        }
      }
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error("Error importing contacts:", error);
    return NextResponse.json({ error: "Failed to import contacts" }, { status: 500 });
  }
}
