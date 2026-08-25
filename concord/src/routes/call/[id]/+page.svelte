<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/authStore';
  import { onMount, onDestroy } from 'svelte';
  
  const groupId = $page.params.id;
  
  let localStream: MediaStream | null = null;
  let localVideoEl: HTMLVideoElement;
  
  // Lista de vídeos remotos
  let remoteStreams: { peerId: string, stream: MediaStream }[] = [];
  
  // Estado das conexões WebRTC
  let peerConnections: Record<string, RTCPeerConnection> = {};
  let roomChannel: any;
  
  // Configuração STUN (básica do Google para NAT traversal)
  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  onMount(async () => {
    if (!$user) return;
    
    // 1. Pegar a Tela (Screen Sharing)
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      if (localVideoEl) {
        localVideoEl.srcObject = localStream;
      }
    } catch (err) {
      console.error("Erro ao capturar tela:", err);
      alert("Permissão negada ou erro ao capturar tela.");
      return;
    }

    // 2. Conectar no Supabase Realtime
    roomChannel = supabase.channel(`room:${groupId}`);
    
    roomChannel
      .on('broadcast', { event: 'webrtc-signal' }, async (payload: any) => {
        const { type, senderId, data } = payload.payload;
        if (senderId === $user.id) return; // Ignora próprias mensagens
        
        if (type === 'peer-joined') {
          // Novo peer entrou. Eu (que já estou na sala) vou criar uma OFFER para ele
          await createOffer(senderId);
        } else if (type === 'offer') {
          // Alguém me mandou uma OFFER. Vou responder com ANSWER
          await handleOffer(senderId, data);
        } else if (type === 'answer') {
          // Recebi um ANSWER para a minha oferta
          await handleAnswer(senderId, data);
        } else if (type === 'ice-candidate') {
          // Recebi um ICE Candidate
          await handleIceCandidate(senderId, data);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Avisa a todos na sala que eu entrei
          roomChannel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: { type: 'peer-joined', senderId: $user.id }
          });
        }
      });
  });

  onDestroy(() => {
    // Limpar conexões e câmera ao sair
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnections).forEach(pc => pc.close());
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
    }
  });

  // ------- WEB RTC LOGIC -------

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    // Adiciona as tracks da minha tela na conexão
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream!));
    }
    
    // Quando descobrir um ICE candidate, envia para o peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        roomChannel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { type: 'ice-candidate', senderId: $user!.id, data: { target: peerId, candidate: event.candidate } }
        });
      }
    };
    
    // Quando receber a stream (tela) do outro peer, mostra na UI
    pc.ontrack = (event) => {
      // Verifica se a stream já existe na lista
      const exists = remoteStreams.find(s => s.peerId === peerId);
      if (!exists) {
        remoteStreams = [...remoteStreams, { peerId, stream: event.streams[0] }];
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Remove da tela se o peer cair
        remoteStreams = remoteStreams.filter(s => s.peerId !== peerId);
        pc.close();
        delete peerConnections[peerId];
      }
    };

    peerConnections[peerId] = pc;
    return pc;
  };

  const createOffer = async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    roomChannel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: { type: 'offer', senderId: $user!.id, data: { target: peerId, sdp: offer } }
    });
  };

  const handleOffer = async (senderId: string, data: any) => {
    if (data.target !== $user!.id) return;
    
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    roomChannel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: { type: 'answer', senderId: $user!.id, data: { target: senderId, sdp: answer } }
    });
  };

  const handleAnswer = async (senderId: string, data: any) => {
    if (data.target !== $user!.id) return;
    const pc = peerConnections[senderId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    }
  };

  const handleIceCandidate = async (senderId: string, data: any) => {
    if (data.target !== $user!.id) return;
    const pc = peerConnections[senderId];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };
  const setSrcObject = (node: HTMLVideoElement, stream: MediaStream) => {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream) {
        node.srcObject = newStream;
      }
    };
  };
</script>

<div class="call-container">
  <header>
    <a href="/">&larr; Sair da Sala</a>
    <h2>Sala de Compartilhamento de Tela</h2>
  </header>
  
  <div class="video-grid">
    <!-- Sua Tela Local -->
    <div class="video-box">
      <video bind:this={localVideoEl} autoplay muted playsinline></video>
      <div class="label">Sua Tela</div>
    </div>
    
    <!-- Telas Remotas -->
    {#each remoteStreams as remote (remote.peerId)}
      <div class="video-box">
        <video autoplay playsinline use:setSrcObject={remote.stream}></video>
        <div class="label">Participante</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .call-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #111827;
    color: white;
  }
  header {
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #1f2937;
  }
  header a {
    color: #ef4444;
    text-decoration: none;
    font-weight: bold;
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
  }
  h2 { margin: 0; font-size: 1.25rem; }
  
  .video-grid {
    flex: 1;
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
  }
  
  .video-box {
    background: #374151;
    border-radius: 8px;
    aspect-ratio: 16/9;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: black;
  }
  
  .label {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0,0,0,0.6);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    pointer-events: none;
  }
</style>
