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
      if (from) {
        const type = message.type || 'text';
        let textBody = '';
        let mediaId = null;
        let mimeType = null;
        let fileName = null;

        if (type === 'text') {
          textBody = message.text?.body || '';
        } else if (['image', 'audio', 'video', 'document', 'sticker'].includes(type)) {
          const mediaObj = message[type];
          if (mediaObj) {
            mediaId = mediaObj.id || null;
            mimeType = mediaObj.mime_type || null;
            fileName = mediaObj.filename || null;
            textBody = mediaObj.caption || `[${type.charAt(0).toUpperCase() + type.slice(1)}]`;
          }
        }
        
        const contactInfo = body.entry[0].changes[0].value.contacts?.[0];
        const profileName = contactInfo?.profile?.name || from;

        if (textBody || mediaId) {
          let contact = await prisma.contact.findUnique({ where: { phone: from } });
          
          if (!contact) {
            let defaultList = await prisma.contactList.findUnique({ where: { name: 'Fora de Sequencia' } });
            if (!defaultList) {
               defaultList = await prisma.contactList.create({ data: { name: 'Fora de Sequencia' } });
            }
            contact = await prisma.contact.create({
              data: {
                phone: from,
                name: profileName,
                lists: { connect: { id: defaultList.id } }
              }
            });
          } else if (!contact.name || contact.name === from) {
            contact = await prisma.contact.update({
              where: { phone: from },
              data: { name: profileName }
            });
          }

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
              content: textBody || '',
              type: type.toUpperCase(),
              mediaId: mediaId,
              mimeType: mimeType,
              fileName: fileName,
              direction: "INBOUND"
            }
          });

          // Send Push Notification
          if (conv.lockedById) {
            const agent = await prisma.user.findUnique({
              where: { id: conv.lockedById },
              select: { expoPushToken: true }
            });

            if (agent?.expoPushToken) {
              const pushMessage = {
                to: agent.expoPushToken,
                sound: 'default',
                title: profileName,
                body: textBody || `[Nova Mensagem - ${type.toUpperCase()}]`,
                data: { conversationId: conv.id },
              };

              fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Accept-encoding': 'gzip, deflate',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(pushMessage),
              }).catch(err => console.error('Erro ao enviar push:', err));
            }
          }
        }
      }
    }
    
    // É obrigatório responder 200 OK rapidamente para a Meta
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erro ao processar Webhook POST:', error);
    return NextResponse.json({ success: true }, { status: 200 }); // Always return 200 for Meta
  }
}
