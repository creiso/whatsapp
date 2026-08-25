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
  
  let isSharing = false;
  let peersInRoom: string[] = []; // IDs de quem está na sala

  // Configuração STUN (básica do Google)
  const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  onMount(() => {
    if (!$user) return;
    
    roomChannel = supabase.channel(`room:${groupId}`);
    roomChannel
      .on('broadcast', { event: 'webrtc-signal' }, async (payload: any) => {
        const { type, senderId, data } = payload.payload;
        if (senderId === $user.id) return;
        
        if (type === 'peer-joined') {
          if (!peersInRoom.includes(senderId)) peersInRoom = [...peersInRoom, senderId];
          // Se eu já estiver compartilhando, eu inicio uma conexão enviando minha tela pra ele
          if (isSharing) {
            await sendOffer(senderId);
          }
        } else if (type === 'offer') {
          if (!peersInRoom.includes(senderId)) peersInRoom = [...peersInRoom, senderId];
          await handleOffer(senderId, data);
        } else if (type === 'answer') {
          await handleAnswer(senderId, data);
        } else if (type === 'ice-candidate') {
          await handleIceCandidate(senderId, data);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Avisa que entrei
          roomChannel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: { type: 'peer-joined', senderId: $user.id }
          });
        }
      });
  });

  onDestroy(() => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    Object.values(peerConnections).forEach(pc => pc.close());
    if (roomChannel) supabase.removeChannel(roomChannel);
  });

  const startSharing = async () => {
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (localVideoEl) localVideoEl.srcObject = localStream;
      isSharing = true;
      
      // Ao compartilhar, enviar oferta para todos que já estão na sala
      for (const peerId of peersInRoom) {
        await sendOffer(peerId);
      }
      
      // Se eu parar de compartilhar pela barrinha do navegador
      localStream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };
    } catch (err) {
      console.error("Erro ao compartilhar tela:", err);
    }
  };
  
  const stopSharing = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    localStream = null;
    isSharing = false;
    // Avisar pros outros seria o ideal, mas por enquanto a track só pausa
  };

  const getOrCreatePeerConnection = (peerId: string) => {
    if (peerConnections[peerId]) return peerConnections[peerId];
    
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        roomChannel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { type: 'ice-candidate', senderId: $user!.id, data: { target: peerId, candidate: event.candidate } }
        });
      }
    };
    
    pc.ontrack = (event) => {
      const exists = remoteStreams.find(s => s.peerId === peerId);
      if (!exists) {
        remoteStreams = [...remoteStreams, { peerId, stream: event.streams[0] }];
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        remoteStreams = remoteStreams.filter(s => s.peerId !== peerId);
        pc.close();
        delete peerConnections[peerId];
      }
    };

    peerConnections[peerId] = pc;
    return pc;
  };

  const sendOffer = async (peerId: string) => {
    const pc = getOrCreatePeerConnection(peerId);
    
    // Adicionar minhas tracks (caso eu esteja compartilhando)
    if (localStream) {
      // Evita duplicar tracks
      const senders = pc.getSenders();
      localStream.getTracks().forEach(track => {
        if (!senders.find(s => s.track === track)) {
          pc.addTrack(track, localStream!);
        }
      });
    }
    
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
    
    const pc = getOrCreatePeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    
    // Se eu também estiver compartilhando tela, adiciono minhas tracks pra responder com elas
    if (localStream) {
      const senders = pc.getSenders();
      localStream.getTracks().forEach(track => {
        if (!senders.find(s => s.track === track)) pc.addTrack(track, localStream!);
      });
    }
    
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
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  };

  const handleIceCandidate = async (senderId: string, data: any) => {
    if (data.target !== $user!.id) return;
    const pc = peerConnections[senderId];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  };

  const setSrcObject = (node: HTMLVideoElement, stream: MediaStream) => {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream) { node.srcObject = newStream; }
    };
  };
</script>

<div class="call-container">
  <header>
    <a href="/">&larr; Sair da Sala</a>
    <h2>Sala de Reunião</h2>
    
    <div class="controls">
      {#if !isSharing}
        <button class="btn-share" on:click={startSharing}>Compartilhar Minha Tela</button>
      {:else}
        <button class="btn-stop" on:click={stopSharing}>Parar Compartilhamento</button>
      {/if}
    </div>
  </header>
  
  <div class="workspace">
    {#if remoteStreams.length === 0 && !isSharing}
      <div class="empty-room">
        <h3>Você está na sala como espectador.</h3>
        <p>Aguardando alguém compartilhar a tela, ou clique em "Compartilhar Minha Tela" acima.</p>
      </div>
    {:else}
      <div class="video-grid">
        <!-- Minha tela (se estiver compartilhando) -->
        {#if isSharing}
          <div class="video-box my-screen">
            <video bind:this={localVideoEl} autoplay muted playsinline></video>
            <div class="label">Sua Tela</div>
          </div>
        {/if}
        
        <!-- Telas dos outros -->
        {#each remoteStreams as remote (remote.peerId)}
          <div class="video-box remote-screen">
            <video autoplay playsinline use:setSrcObject={remote.stream}></video>
            <div class="label">Tela Compartilhada</div>
          </div>
        {/each}
      </div>
    {/if}
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
    background: #1f2937;
  }
  header a {
    color: #ef4444;
    text-decoration: none;
    font-weight: bold;
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
    margin-right: 1rem;
  }
  h2 { margin: 0; font-size: 1.25rem; flex: 1; }
  
  .controls { display: flex; gap: 1rem; }
  .btn-share { padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
  .btn-stop { padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
  
  .workspace {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .empty-room {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
  }
  
  .video-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1rem;
    overflow-y: auto;
  }
  
  .video-box {
    background: #374151;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
  }
  .my-screen { border-color: #2563eb; }
  
  video { width: 100%; height: 100%; object-fit: contain; background: black; }
  
  .label {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0,0,0,0.7);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    pointer-events: none;
  }
</style>
