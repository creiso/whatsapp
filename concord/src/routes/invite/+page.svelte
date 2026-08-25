<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/authStore';
  import { onMount } from 'svelte';
  
  let token = '';
  let groupName = 'Carregando...';
  let inviteData: any = null;
  let loading = true;
  let errorMsg = '';
  let accepting = false;

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (!urlToken) {
      errorMsg = 'Nenhum token fornecido na URL.';
      loading = false;
      return;
    }
    
    token = urlToken;
    
    // Buscar info do convite e do grupo
    const { data, error } = await supabase
      .from('concord_invites')
      .select('group_id, usado, expira_em, concord_groups(nome)')
      .eq('token', token)
      .single();
      
    if (error || !data) {
      errorMsg = 'Convite inválido ou não encontrado.';
      loading = false;
      return;
    }
    
    if (data.usado) {
      errorMsg = 'Este convite já foi utilizado.';
      loading = false;
      return;
    }
    
    if (new Date(data.expira_em) < new Date()) {
      errorMsg = 'Este convite expirou.';
      loading = false;
      return;
    }
    
    inviteData = data;
    groupName = data.concord_groups.nome;
    loading = false;
  });

  const handleAcceptInvite = async () => {
    if (!$user || !inviteData) return;
    
    accepting = true;
    errorMsg = '';
    
    // Inserir o membro (ignora erro se já for membro)
    const { error: memberError } = await supabase
      .from('concord_group_members')
      .insert({ group_id: inviteData.group_id, user_id: $user.id, papel: 'ligador' });
      
    if (memberError && memberError.code !== '23505') { // 23505 é erro de chave duplicada (já é membro)
      errorMsg = 'Erro ao entrar na sala: ' + memberError.message;
      accepting = false;
      return;
    }
    
    // Marcar como usado
    await supabase
      .from('concord_invites')
      .update({ usado: true })
      .eq('token', token);
      
    window.location.href = '/';
  };
</script>

<div class="container">
  <div class="card">
    {#if loading}
      <p style="text-align:center;">Verificando convite...</p>
    {:else if errorMsg}
      <h2>Ops!</h2>
      <div class="error">{errorMsg}</div>
      <div style="text-align:center; margin-top: 1rem;">
        <a href="/">Ir para o Início</a>
      </div>
    {:else}
      <h2>Convite Recebido!</h2>
      <p class="invite-text">Você foi convidado(a) para participar da sala:</p>
      <h3 class="group-name">{groupName}</h3>
      
      {#if $user}
        <p class="user-text">Você está logado como: <strong>{$user.email}</strong></p>
        <button on:click={handleAcceptInvite} disabled={accepting}>
          {accepting ? 'Entrando...' : 'Aceitar Convite'}
        </button>
      {:else}
        <p class="user-text">Você precisa criar uma conta ou fazer login para entrar.</p>
        <div class="buttons">
          <a href="/register?token={token}" class="btn-primary">Criar Conta e Entrar</a>
          <a href="/login" class="btn-secondary">Fazer Login</a>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-image: radial-gradient(circle at 50% -20%, #3b0764, var(--bg-dark) 50%);
  }
  .card {
    background: var(--bg-card);
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    width: 100%;
    max-width: 450px;
    border: 1px solid var(--border-color);
  }
  h2 { margin-top: 0; text-align: center; color: white; }
  h3.group-name { text-align: center; color: var(--accent-gold); font-size: 1.5rem; margin-bottom: 2rem; background: rgba(251, 191, 36, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.2); }
  .invite-text { text-align: center; color: var(--text-muted); }
  .user-text { text-align: center; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-muted); }
  
  button {
    width: 100%;
    padding: 0.75rem;
    background: var(--accent-purple);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.2s;
  }
  button:hover:not(:disabled) { background: var(--accent-purple-hover); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .buttons { display: flex; flex-direction: column; gap: 1rem; }
  .buttons a { text-align: center; padding: 0.75rem; border-radius: 6px; font-weight: bold; text-decoration: none; transition: background 0.2s; }
  .btn-primary { background: var(--accent-purple); color: white; }
  .btn-primary:hover { background: var(--accent-purple-hover); color: white; }
  .btn-secondary { background: transparent; color: var(--text-main); border: 1px solid var(--border-color); }
  .btn-secondary:hover { border-color: var(--text-main); color: var(--text-main); }
  
  .error { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); padding: 1rem; border-radius: 6px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.2); }
</style>
