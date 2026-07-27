"use client";

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './chat.module.css';

// Mocks para simular a interface inicial
const MOCK_CONVERSATIONS = [
  {
    id: '1',
    contactName: 'João Silva',
    lastMessage: 'Gostaria de saber mais sobre a campanha.',
    time: '10:30',
    lockedBy: null, // Sem dono ainda (fila)
    messages: [
      { id: 'm1', direction: 'INBOUND', content: 'Gostaria de saber mais sobre a campanha.', time: '10:30' }
    ]
  },
  {
    id: '2',
    contactName: 'Maria Oliveira',
    lastMessage: 'Perfeito, vou assinar o plano.',
    time: 'Ontem',
    lockedBy: 'admin@admin.com', // Já tem dono
    messages: [
      { id: 'm1', direction: 'OUTBOUND', content: 'Olá Maria! Nosso plano premium custa R$99/mês.', time: '14:20' },
      { id: 'm2', direction: 'INBOUND', content: 'Perfeito, vou assinar o plano.', time: '14:25' }
    ]
  }
];

export default function ChatPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeId);
  const currentUserEmail = session?.user?.email;

  // Rola para baixo ao abrir conversa ou receber mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    // Se a conversa não tem dono (lockedBy == null), o primeiro a responder "rouba" o lead (Lock)
    const isFirstReply = !activeConversation.lockedBy;

    const newMessage = {
      id: Date.now().toString(),
      direction: 'OUTBOUND',
      content: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeId) {
        return {
          ...conv,
          lastMessage: newMessage.content,
          time: newMessage.time,
          lockedBy: isFirstReply ? (currentUserEmail || null) : conv.lockedBy,
          messages: [...conv.messages, newMessage]
        };
      }
      return conv;
    }));

    setInputText('');
  };

  // Verifica se o usuário atual pode digitar (Se não tem dono OU se ele é o dono)
  const canType = activeConversation && (!activeConversation.lockedBy || activeConversation.lockedBy === currentUserEmail);

  return (
    <div className={styles.container}>
      {/* SIDEBAR - Lista de Contatos */}
      <div className={styles.sidebar}>
        <div className={styles.searchHeader}>
          <input type="text" placeholder="Buscar conversas..." className={styles.searchInput} />
        </div>
        <div className={styles.conversationList}>
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`${styles.conversationItem} ${activeId === conv.id ? styles.conversationItemActive : ''}`}
              onClick={() => setActiveId(conv.id)}
            >
              <div className={styles.avatar}>
                {conv.contactName.charAt(0)}
              </div>
              <div className={styles.conversationInfo}>
                <div className={styles.contactName}>
                  {conv.contactName}
                  <span className={styles.time}>{conv.time}</span>
                </div>
                <div className={styles.lastMessage}>{conv.lastMessage}</div>
                <div className={styles.tags}>
                  {!conv.lockedBy ? (
                    <span className={styles.tag}>Fila Aberta</span>
                  ) : conv.lockedBy === currentUserEmail ? (
                    <span className={styles.tag}>Seu Lead</span>
                  ) : (
                    <span className={`${styles.tag} ${styles.tagLocked}`}>🔒 Lock: {conv.lockedBy}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DE CHAT - Mensagens */}
      <div className={styles.chatArea}>
        {activeConversation ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.avatar} style={{ width: 40, height: 40, fontSize: 16 }}>
                {activeConversation.contactName.charAt(0)}
              </div>
              <div>
                <h2 style={{ fontSize: 16, color: '#fff' }}>{activeConversation.contactName}</h2>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>
                  {activeConversation.lockedBy ? `Atendido por ${activeConversation.lockedBy}` : 'Aguardando atendimento'}
                </span>
              </div>
            </div>

            <div className={styles.messagesContainer}>
              {activeConversation.messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`${styles.message} ${msg.direction === 'INBOUND' ? styles.messageInbound : styles.messageOutbound}`}
                >
                  {msg.content}
                  <div className={styles.messageTime}>{msg.time}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input ou Banner de Bloqueio */}
            {canType ? (
              <form onSubmit={handleSendMessage} className={styles.inputArea}>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite uma mensagem..." 
                  className={styles.input} 
                />
                <button type="submit" className={styles.sendButton} disabled={!inputText.trim()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            ) : (
              <div className={styles.lockedBanner}>
                🔒 Esta conversa está bloqueada. Ela pertence a {activeConversation.lockedBy}.
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: 16 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
