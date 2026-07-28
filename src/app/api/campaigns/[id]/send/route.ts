import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        list: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT") {
      return NextResponse.json({ error: "Campaign has already been started or completed" }, { status: 400 });
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["meta_access_token", "meta_phone_number_id"],
        },
      },
    });

    const metaAccessToken = settings.find((s: any) => s.key === "meta_access_token")?.value;
    const metaPhoneId = settings.find((s: any) => s.key === "meta_phone_number_id")?.value;

    if (!metaAccessToken || !metaPhoneId) {
      return NextResponse.json(
        { error: "Meta settings missing. Please configure them in Settings." },
        { status: 400 }
      );
    }
    
    // Fetch template language
    const metaTemplate = await prisma.metaTemplate.findUnique({
      where: { name: campaign.template }
    });
    const templateLanguage = metaTemplate?.language || "pt_BR";
    const varMapping = JSON.parse((campaign as any).variablesRecord || "{}");

    // Mark as running before sending (optional but good practice)
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "RUNNING" },
    });

    const contacts = campaign.list?.contacts || [];

    // Send messages in sequence to avoid rate limiting
    let sentCount = 0;
    let errorCount = 0;

    for (const contact of contacts) {
      try {
        const templateComponents = JSON.parse((metaTemplate as any)?.components || "[]");
        const apiComponents = [];
        for (const comp of templateComponents) {
          const text = comp.text || "";
          const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
          if (matches.length > 0) {
            const parameters = [];
            for (const match of matches) {
              const varNum = match[1];
              const map = varMapping[`${comp.type.toLowerCase()}_${varNum}`]; // e.g. body_1
              let paramText = "";
              if (map) {
                if (map.type === "name") paramText = contact.name || "";
                else if (map.type === "phone") paramText = contact.phone || "";
                else if (map.type === "manual") paramText = map.value || "";
                else if (map.type === "custom") {
                  const attrs = JSON.parse((contact as any).attributes || "{}");
                  paramText = attrs[map.value] || "";
                }
              }
              parameters.push({ type: "text", text: paramText });
            }
            apiComponents.push({ type: comp.type.toLowerCase(), parameters });
          }
        }

        const templatePayload: any = {
          name: campaign.template,
          language: { code: templateLanguage },
        };
        
        if (apiComponents.length > 0) {
          templatePayload.components = apiComponents;
        }

        const response = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${metaAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: contact.phone,
            type: "template",
            template: templatePayload,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error("Failed to send message to", contact.phone, errData);
          errorCount++;
        } else {
          sentCount++;
          // Salvar no feed de mensagens
          let conv = await prisma.conversation.findFirst({
            where: { contactId: contact.id, status: "OPEN" }
          });
          if (!conv) {
            conv = await prisma.conversation.create({
              data: { contactId: contact.id }
            });
          }
          await prisma.message.create({
            data: {
              conversationId: conv.id,
              content: `[Campanha Automática] Template: ${campaign.template}`,
              direction: "OUTBOUND"
            }
          });
        }
      } catch (err) {
        console.error("Error sending to", contact.phone, err);
        errorCount++;
      }

      // CRITICAL: wait 600ms between each request
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    // Complete campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { 
        status: "COMPLETED",
        sent: sentCount,
        errors: errorCount,
        total: contacts.length
      },
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error("Error starting campaign:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
