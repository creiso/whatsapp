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
  lastMessageId: string | null;
  lastMessageDirection: string | null;
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
  status?: string;
  type?: string;
  mediaId?: string;
  mimeType?: string;
  fileName?: string;
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
  const [users, setUsers] = useState<UserData[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recorderRef = useRef<any>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousConversationsRef = useRef<Conversation[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Initialize MicRecorder
    // @ts-ignore
    import('mic-recorder-to-mp3').then((MicRecorder) => {
      recorderRef.current = new MicRecorder.default({ bitRate: 128 });
    }).catch((e: any) => console.error("MicRecorder error", e));
  }, []);

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

  // Fetch teams and users
  useEffect(() => {
    if (currentUser) {
      fetch('/api/teams')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setTeams(data);
        });

      if (currentUser.role === 'ADMIN') {
        fetch('/api/users')
          .then(res => res.json())
          .then(data => {
            if (!data.error) setUsers(data);
          });
      }
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
        
        // Notification logic
        if (previousConversationsRef.current.length > 0 && currentUser) {
          let newSenderName = '';
          const newInbound = data.some((conv: Conversation) => {
            if (conv.lockedById === currentUser.id && conv.lastMessageDirection === 'INBOUND') {
              const prev = previousConversationsRef.current.find(c => c.id === conv.id);
              if (prev && prev.lastMessageId !== conv.lastMessageId) {
                newSenderName = conv.contactName;
                return true;
              }
            }
            return false;
          });

          if (newInbound) {
            // Toca o som
            audioRef.current?.play().catch(e => console.log('Audio play failed:', e));
            
            // Muda o título da aba
            document.title = `(1) Nova Mensagem - LeadMoon`;
            
            // Dispara a notificação no Windows/Mac
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nova mensagem no LeadMoon', {
                body: `Você recebeu uma nova mensagem de ${newSenderName}`,
                icon: '/logo.png'
              });
            }
          }
        }

        previousConversationsRef.current = data;
        setConversations(data);
        // Update active conversation reference using functional state to avoid stale closures
        setActiveConversation(prev => {
          if (!prev) return prev;
          const updatedActive = data.find((c: Conversation) => c.id === prev.id);
          return updatedActive || prev;
        });
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
    
    // Se o usuário está olhando a conversa, limpa o título da aba
    if (document.title.includes('(1) Nova Mensagem')) {
      document.title = 'LeadMoon - WhatsApp CRM';
    }
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
      status: 'sending',
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

  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (file: File | Blob, type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT', fileName?: string) => {
    if (!file || !activeConversation) return;

    const formData = new FormData();
    // Se for blob (gravação), nomeamos como audio.ogg, caso contrário file.name
    formData.append('file', file, fileName || (file as File).name || 'upload');
    formData.append('conversationId', activeConversation.id);
    formData.append('type', type);

    const tempMsg: Message = {
      id: Date.now().toString(),
      direction: 'OUTBOUND',
      content: `[Enviando ${type.toLowerCase()}...]`,
      status: 'sending',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch('/api/chat/messages/media', {
        method: 'POST',
        body: formData
      });
      fetchMessages();
      fetchConversations();
    } catch (err) {
      console.error("Failed to send media", err);
    }
  };

  const startRecording = () => {
    if (!recorderRef.current) {
      alert("Gravador não inicializado ainda.");
      return;
    }
    recorderRef.current.start().then(() => {
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }).catch((err: any) => {
      console.error("Microphone permission denied or error:", err);
      alert("Não foi possível acessar o microfone.");
    });
  };

  const stopRecording = () => {
    if (!recorderRef.current || !isRecording) return;
    
    recorderRef.current.stop().getMp3().then(([buffer, blob]: any) => {
      const audioFile = new File(buffer, 'audio_message.mp3', {
        type: blob.type || 'audio/mpeg',
        lastModified: Date.now()
      });
      handleMediaUpload(audioFile, 'AUDIO', 'audio_message.mp3');
    }).catch((e: any) => {
      console.error(e);
      alert("Erro ao salvar áudio.");
    });

    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTransfer = async (teamId: string | null, lockedById?: string | null) => {
    if (!activeConversation) return;
    try {
      const res = await fetch(`/api/contacts/${activeConversation.contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, lockedById })
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
                flex: 1, padding: '8px', background: filter === 'triagem' ? 'var(--primary)' : 'rgba(100,100,100,0.1)', 
                color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
              }}
              onClick={() => setFilter('triagem')}
            >
              Triagem
            </button>
            <button 
              style={{
                flex: 1, padding: '8px', background: filter === 'team' ? 'var(--primary)' : 'rgba(100,100,100,0.1)', 
                color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
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
             <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
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
                  <h2 style={{ fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>{activeConversation.contactName}</h2>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {activeConversation.lockedBy ? `Atendido por ${activeConversation.lockedBy}` : 'Aguardando atendimento'}
                  </span>
                </div>
              </div>

              {(currentUser?.role === 'ADMIN' || activeConversation.teamId === null) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Atribuir à Equipe:</span>
                  <select 
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', padding: '6px', borderRadius: '4px' }}
                    value={activeConversation.teamId || ''}
                    onChange={(e) => handleTransfer(e.target.value || null, activeConversation.lockedById)}
                  >
                    <option value="">Triagem (Sem Equipe)</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  
                  {currentUser?.role === 'ADMIN' && (
                    <>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px' }}>Atribuir ao Agente:</span>
                      <select 
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', padding: '6px', borderRadius: '4px' }}
                        value={activeConversation.lockedById || ''}
                        onChange={(e) => handleTransfer(activeConversation.teamId, e.target.value || null)}
                      >
                        <option value="">Nenhum Agente</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.email}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={styles.messagesContainer}>
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`${styles.message} ${msg.direction === 'INBOUND' ? styles.messageInbound : styles.messageOutbound}`}
                >
                  {msg.type === 'IMAGE' && msg.mediaId && (
                    <img src={`/api/media/${msg.mediaId}`} alt="Imagem" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }} />
                  )}
                  {msg.type === 'VIDEO' && msg.mediaId && (
                    <video controls src={`/api/media/${msg.mediaId}`} style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }} />
                  )}
                  {msg.type === 'AUDIO' && msg.mediaId && (
                    <audio controls src={`/api/media/${msg.mediaId}`} style={{ width: '100%', marginBottom: '8px' }} />
                  )}
                  {msg.type === 'DOCUMENT' && msg.mediaId && (
                    <a href={`/api/media/${msg.mediaId}`} download={msg.fileName || 'document'} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textDecoration: 'none', color: '#fff', marginBottom: '8px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                      {msg.fileName || 'Arquivo Anexo'}
                    </a>
                  )}
                  {msg.type === 'STICKER' && msg.mediaId && (
                    <img src={`/api/media/${msg.mediaId}`} alt="Sticker" style={{ maxWidth: '120px', marginBottom: '8px' }} />
                  )}
                  {msg.content && <div>{msg.content}</div>}
                  <div className={styles.messageTime}>
                    {msg.time}
                    {msg.direction === 'OUTBOUND' && (
                      <span style={{ marginLeft: 4, fontSize: '12px' }}>
                        {msg.status === 'FAILED' ? (
                          <span title="Erro ao enviar na API. Verifique os logs." style={{ cursor: 'pointer' }}>ℹ️</span>
                        ) : msg.status === 'sending' ? (
                          <span style={{ color: '#9ca3af' }}>⏳</span>
                        ) : (
                          <span style={{ color: '#34b7f1' }}>✓✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {canType ? (
              <form onSubmit={handleSendMessage} className={styles.inputArea}>
                <input 
                  type="file" 
                  ref={mediaInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fileType = file.type.startsWith('video') ? 'VIDEO' : file.type.startsWith('application/pdf') ? 'DOCUMENT' : 'IMAGE';
                      handleMediaUpload(file, fileType);
                    }
                    e.target.value = '';
                  }}
                />

                <button 
                  type="button" 
                  className={styles.sendButton} 
                  style={{ background: 'rgba(100,100,100,0.1)', color: 'var(--text-primary)' }}
                  onClick={() => mediaInputRef.current?.click()}
                  title="Enviar Mídia / Documento"
                >
                  📎
                </button>

                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                  placeholder="Digite sua mensagem..." 
                  className={styles.input}
                  disabled={!canType}
                />

                <button 
                  type="button" 
                  className={styles.sendButton} 
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || !canType}
                >
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: 16 }}>
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
