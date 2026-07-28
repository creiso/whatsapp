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
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      direction: msg.direction,
      content: msg.content,
      time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return NextResponse.json(formattedMessages);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversationId, content } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
       return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Lock the conversation to this user if it isn't locked
    const conv = await prisma.conversation.findUnique({ 
      where: { id: conversationId },
      include: { contact: true }
    });
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!conv.lockedById) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lockedById: user.id }
      });
    }

    const accessTokenSetting = await prisma.setting.findUnique({ where: { key: "meta_access_token" } });
    const phoneNumberIdSetting = await prisma.setting.findUnique({ where: { key: "meta_phone_number_id" } });
    
    if (accessTokenSetting && phoneNumberIdSetting && accessTokenSetting.value && phoneNumberIdSetting.value) {
      const metaUrl = `https://graph.facebook.com/v17.0/${phoneNumberIdSetting.value}/messages`;
      
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: conv.contact.phone,
        type: "text",
        text: {
          preview_url: false,
          body: content,
        }
      };

      const metaRes = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessTokenSetting.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!metaRes.ok) {
        const errorData = await metaRes.json();
        console.error("Meta API error:", errorData);
        // We still save the message or maybe fail? Let's assume we proceed or handle error.
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        direction: "OUTBOUND",
        senderId: user.id,
      }
    });

    return NextResponse.json({
      id: message.id,
      direction: message.direction,
      content: message.content,
      time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
