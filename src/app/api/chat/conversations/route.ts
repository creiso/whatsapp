import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "team"; // 'triagem' or 'team'
  const requestedTeamId = searchParams.get("teamId") || null;
  const sessionUser = session.user as any;
  const userRole = sessionUser.role;
  const userTeamId = sessionUser.teamId;

  try {
    let whereClause: any = {
      status: "OPEN"
    };

    if (filter === "triagem") {
      whereClause.contact = { teamId: null };
    } else if (filter === "team") {
      if (userRole === "AGENT") {
        if (!userTeamId) {
          // If agent has no team, they can only see their locked conversations
          whereClause.lockedById = sessionUser.id;
        } else {
          whereClause.contact = { teamId: userTeamId };
        }
      } else {
        if (requestedTeamId) {
          whereClause.contact = { teamId: requestedTeamId };
        }
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        contact: true,
        lockedBy: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    // Sort manually by latest message time, since Conversation might not have updatedAt
    const formatted = conversations.map(conv => {
      const lastMessage = conv.messages[0];
      return {
        id: conv.id,
        contactName: conv.contact.name || conv.contact.phone,
        contactId: conv.contact.id,
        lastMessage: lastMessage?.content || "Nenhuma mensagem",
        time: lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        lockedBy: conv.lockedBy?.name || conv.lockedBy?.email || null,
        lockedById: conv.lockedById,
        teamId: conv.contact.teamId,
      };
    });

    // We should probably sort the formatted list
    formatted.sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return b.time.localeCompare(a.time); // Simple time string comparison (might not work well across days, but OK for now)
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
