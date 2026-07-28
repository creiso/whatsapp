import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: { users: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nome da equipe é obrigatório." }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json({ error: "Erro ao criar equipe." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!team) {
      return NextResponse.json({ error: "Equipe não encontrada." }, { status: 404 });
    }

    if (team._count.users > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir. A equipe possui ${team._count.users} usuário(s) vinculado(s).` },
        { status: 400 }
      );
    }

    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json({ error: "Erro ao excluir equipe." }, { status: 500 });
  }
}
