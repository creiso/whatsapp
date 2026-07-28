import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Validação do Webhook (Quando o Facebook tenta verificar a URL)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    // Buscar o token configurado no banco de dados
    const setting = await prisma.setting.findUnique({
      where: { key: 'meta_webhook_verify_token' }
    });

    const verifyToken = setting?.value || '';

    // Verifica se o token recebido bate com o salvo no painel
    if (token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error('Falha na verificação do Webhook. Tokens não batem.', { recebido: token, esperado: verifyToken });
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// Recebimento das Mensagens (Quando um cliente manda mensagem)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Mensagem recebida do Webhook:', JSON.stringify(body, null, 2));
    
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const textBody = message.text?.body;
      
      if (from && textBody) {
        const contact = await prisma.contact.upsert({
          where: { phone: from },
          update: {},
          create: { phone: from, name: from }
        });

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
            content: textBody,
            direction: "INBOUND"
          }
        });
      }
    }
    
    // É obrigatório responder 200 OK rapidamente para a Meta
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erro ao processar Webhook POST:', error);
    return NextResponse.json({ success: true }, { status: 200 }); // Always return 200 for Meta
  }
}
