import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'meta_access_token' }
    });

    const token = setting?.value;
    if (!token) {
      return new NextResponse('Unauthorized: Missing token', { status: 401 });
    }

    const { id } = await params;
    
    // Fetch media metadata
    const mediaRes = await fetch(`https://graph.facebook.com/v17.0/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!mediaRes.ok) {
      return new NextResponse('Failed to fetch media metadata', { status: mediaRes.status });
    }

    const mediaData = await mediaRes.json();

    if (!mediaData.url) {
      return new NextResponse('No media URL found', { status: 404 });
    }

    // Fetch actual binary data
    const fileRes = await fetch(mediaData.url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!fileRes.ok) {
      return new NextResponse('Failed to fetch media file', { status: fileRes.status });
    }

    // Pass the response body directly, it is a ReadableStream
    return new Response(fileRes.body, {
      headers: {
        'Content-Type': mediaData.mime_type || 'application/octet-stream',
      }
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
