import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const accessTokenSetting = await prisma.setting.findUnique({
      where: { key: "meta_access_token" },
    });
    const businessIdSetting = await prisma.setting.findUnique({
      where: { key: "meta_business_id" },
    });

    if (!accessTokenSetting || !businessIdSetting) {
      return NextResponse.json(
        { error: "Meta settings not configured. Please configure in settings." },
        { status: 400 }
      );
    }

    const accessToken = accessTokenSetting.value;
    const businessId = businessIdSetting.value;

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${businessId}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Meta API error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch templates from Meta API" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const templates = data.data;

    // Clear old templates to avoid ghost templates from previous WABA IDs
    await prisma.metaTemplate.deleteMany();

    let count = 0;
    for (const template of templates) {
      await prisma.metaTemplate.create({
        data: {
          name: template.name,
          language: template.language,
          status: template.status,
          category: template.category,
          components: JSON.stringify(template.components),
        },
      });
      count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error syncing meta templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
