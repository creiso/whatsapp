"use client";

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './chat.module.css';

type UserData = {
  id: string;
  email: string;
  role: string;
  teamId: string | null;
  teamName?: string;
};

type Conversation = {
  id: string;
  contactName: string;
  contactId: string;
  lastMessage: string;
  time: string;
  lockedBy: string | null;
  lockedById: string | null;
  teamId: string | null;
};

type Message = {
  id: string;
  direction: string;
  content: string;
  time: string;
};

type Team = {
  id: string;
  name: string;
};

export default function ChatPage() {
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<'triagem' | 'team'>('triagem');
  const [teams, setTeams] = useState<Team[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user details
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/users/me')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setCurrentUser(data);
        });
    }
  }, [session]);

  // Fetch teams if admin
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetch('/api/teams')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setTeams(data);
        });
    }
  }, [currentUser]);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!currentUser) return;
    
    let url = `/api/chat/conversations?filter=${filter}`;
    if (filter === 'team' && currentUser.teamId) {
       url += `&teamId=${currentUser.teamId}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setConversations(data);
        // Update active conversation reference
        if (activeConversation) {
          const updatedActive = data.find((c: Conversation) => c.id === activeConversation.id);
          if (updatedActive) setActiveConversation(updatedActive);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!activeConversation) return;
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${activeConversation.id}`);
      const data = await res.json();
      if (!data.error) {
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Polling intervals
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [currentUser, filter]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const content = inputText.trim();
    setInputText('');

    // Optimistic UI
    const tempMsg: Message = {
      id: Date.now().toString(),
      direction: 'OUTBOUND',
      content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          content
        })
      });
      fetchMessages();
      fetchConversations();
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  const handleTransfer = async (teamId: string) => {
    if (!activeConversation) return;
    try {
      const res = await fetch(`/api/contacts/${activeConversation.contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });
      if (res.ok) {
        // Remove from list or refresh
        setActiveConversation(null);
        fetchConversations();
      }
    } catch (e) {
      console.error("Failed to transfer", e);
    }
  };

  const canType = activeConversation && (!activeConversation.lockedById || activeConversation.lockedById === currentUser?.id);

  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <div className={styles.sidebar}>
        <div className={styles.searchHeader}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button 
              style={{
                flex: 1, padding: '8px', background: filter === 'triagem' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
              }}
              onClick={() => setFilter('triagem')}
            >
              Triagem
            </button>
            <button 
              style={{
                flex: 1, padding: '8px', background: filter === 'team' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
              }}
              onClick={() => setFilter('team')}
            >
              Minha Equipe
            </button>
          </div>
          <input type="text" placeholder="Buscar conversas..." className={styles.searchInput} />
        </div>
        <div className={styles.conversationList}>
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`${styles.conversationItem} ${activeConversation?.id === conv.id ? styles.conversationItemActive : ''}`}
              onClick={() => setActiveConversation(conv)}
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
                  ) : conv.lockedBy === currentUser?.email ? (
                    <span className={styles.tag}>Seu Lead</span>
                  ) : (
                    <span className={`${styles.tag} ${styles.tagLocked}`}>🔒 Lock: {conv.lockedBy}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
             <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
               Nenhuma conversa encontrada.
             </div>
          )}
        </div>
      </div>

      {/* ÁREA DE CHAT */}
      <div className={styles.chatArea}>
        {activeConversation ? (
          <>
            <div className={styles.chatHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={styles.avatar} style={{ width: 40, height: 40, fontSize: 16 }}>
                  {activeConversation.contactName.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: 16, color: '#fff', margin: 0 }}>{activeConversation.contactName}</h2>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>
                    {activeConversation.lockedBy ? `Atendido por ${activeConversation.lockedBy}` : 'Aguardando atendimento'}
                  </span>
                </div>
              </div>

              {currentUser?.role === 'ADMIN' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>Transferir:</span>
                  <select 
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid var(--surface-border)', padding: '6px', borderRadius: '4px' }}
                    value={activeConversation.teamId || ''}
                    onChange={(e) => handleTransfer(e.target.value)}
                  >
                    <option value="">Triagem (Sem Equipe)</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className={styles.messagesContainer}>
              {messages.map(msg => (
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
