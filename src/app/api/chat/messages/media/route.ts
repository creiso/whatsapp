import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const mediaType = (formData.get("type") as string) || "IMAGE";

    if (!file || !conversationId) {
      return NextResponse.json({ error: "File and conversationId are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!conv.lockedById) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lockedById: user.id },
      });
    }

    const accessTokenSetting = await prisma.setting.findUnique({ where: { key: "meta_access_token" } });
    const phoneNumberIdSetting = await prisma.setting.findUnique({ where: { key: "meta_phone_number_id" } });

    if (!accessTokenSetting?.value || !phoneNumberIdSetting?.value) {
      return NextResponse.json({ error: "Meta settings missing" }, { status: 400 });
    }

    const token = accessTokenSetting.value;
    const phoneNumberId = phoneNumberIdSetting.value;

    const metaUploadUrl = `https://graph.facebook.com/v17.0/${phoneNumberId}/media`;
    const uploadFormData = new FormData();
    uploadFormData.append("messaging_product", "whatsapp");
    uploadFormData.append("file", file, file.name);
    uploadFormData.append("type", file.type);

    const uploadRes = await fetch(metaUploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json();
      console.error("Meta Upload error:", errorData);
      return NextResponse.json({ error: "Failed to upload media to Meta", details: errorData }, { status: 500 });
    }

    const uploadResult = await uploadRes.json();
    const mediaId = uploadResult.id;

    const metaMessageUrl = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    let typeKey = mediaType.toLowerCase();

    const payloadObj: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conv.contact.phone,
      type: typeKey,
    };

    if (typeKey === "image") payloadObj.image = { id: mediaId };
    else if (typeKey === "video") payloadObj.video = { id: mediaId };
    else if (typeKey === "audio") payloadObj.audio = { id: mediaId };
    else if (typeKey === "document") payloadObj.document = { id: mediaId, filename: file.name };

    const sendRes = await fetch(metaMessageUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadObj),
    });

    let messageStatus = "SENT";
    if (!sendRes.ok) {
      const sendErr = await sendRes.json();
      console.error("Meta Send Media error:", sendErr);
      messageStatus = "FAILED";
    }

    const fallbackText = `[${mediaType.charAt(0) + mediaType.slice(1).toLowerCase()}]`;
    const message = await prisma.message.create({
      data: {
        conversationId,
        content: fallbackText,
        type: mediaType.toUpperCase(),
        mediaId,
        mimeType: file.type,
        fileName: file.name,
        direction: "OUTBOUND",
        senderId: user.id,
        status: messageStatus,
      },
    });

    return NextResponse.json(
      {
        id: message.id,
        direction: message.direction,
        content: message.content,
        type: message.type,
        mediaId: message.mediaId,
        mimeType: message.mimeType,
        fileName: message.fileName,
        status: message.status,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error sending media:", error);
    return NextResponse.json({ error: "Failed to send media" }, { status: 500 });
  }
}
