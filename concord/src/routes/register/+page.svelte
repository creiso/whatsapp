<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  
  let name = '';
  let email = '';
  let password = '';
  let token = '';
  let loading = false;
  let errorMsg = '';
  
  onMount(() => {
    // Pega o token da URL se existir (ex: /register?token=1234)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      token = urlToken;
    }
  });

  const handleRegister = async () => {
    loading = true;
    errorMsg = '';
    
    // 1. Validar convite (verificar se token existe na tabela concord_invites e não foi usado)
    const { data: invite, error: inviteError } = await supabase
      .from('concord_invites')
      .select('group_id, usado, expira_em')
      .eq('token', token)
      .single();
      
    if (inviteError || !invite) {
      errorMsg = 'Convite inválido ou não encontrado.';
      loading = false;
      return;
    }
    
    if (invite.usado) {
      errorMsg = 'Este convite já foi utilizado.';
      loading = false;
      return;
    }
    
    if (new Date(invite.expira_em) < new Date()) {
      errorMsg = 'Este convite está expirado.';
      loading = false;
      return;
    }

    // 2. Criar a conta no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      errorMsg = authError.message;
      loading = false;
      return;
    }
    
    if (authData.user) {
      // 3. Inserir no concord_profiles
      const { error: profileError } = await supabase
        .from('concord_profiles')
        .insert({ id: authData.user.id, nome: name });
        
      if (profileError) {
        errorMsg = 'Erro ao criar perfil. Tente fazer login e completar o cadastro.';
        loading = false;
        return;
      }
      
      // 4. Inserir como membro do grupo do convite (ligador)
      const { error: memberError } = await supabase
        .from('concord_group_members')
        .insert({ group_id: invite.group_id, user_id: authData.user.id, papel: 'ligador' });
        
      if (memberError) {
        errorMsg = 'Erro ao entrar na sala: ' + memberError.message;
        loading = false;
        return;
      }
        
      // 5. Marcar convite como usado
      await supabase
        .from('concord_invites')
        .update({ usado: true })
        .eq('token', token);
        
      // Recarrega a página para o sistema puxar a sessão e ir pro dashboard
      window.location.href = '/';
    }
    
    loading = false;
  };
</script>

<div class="container">
  <div class="card">
    <h2>Cadastro via Convite</h2>
    {#if errorMsg}
      <div class="error">{errorMsg}</div>
    {/if}
    
    <form on:submit|preventDefault={handleRegister}>
      <div class="form-group">
        <label for="token">Token do Convite</label>
        <input id="token" type="text" bind:value={token} required />
      </div>

      <div class="form-group">
        <label for="name">Nome (como aparecerá na chamada)</label>
        <input id="name" type="text" bind:value={name} required />
      </div>
      
      <div class="form-group">
        <label for="email">E-mail</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      
      <div class="form-group">
        <label for="password">Senha</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Cadastrando...' : 'Criar Conta e Entrar no Grupo'}
      </button>
    </form>
    
    <div class="footer">
      <p>Já tem conta? <a href="/login">Faça login</a></p>
    </div>
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
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    width: 100%;
    max-width: 400px;
    border: 1px solid var(--border-color);
  }
  h2 {
    margin-top: 0;
    text-align: center;
    color: white;
  }
  .form-group {
    margin-bottom: 1.25rem;
  }
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  input {
    width: 100%;
    padding: 0.75rem;
    border-radius: 6px;
    box-sizing: border-box;
  }
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
    margin-top: 0.5rem;
  }
  button:hover:not(:disabled) {
    background: var(--accent-purple-hover);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .error {
    background: rgba(239, 68, 68, 0.1);
    color: var(--accent-red);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    text-align: center;
    font-size: 0.875rem;
  }
  .footer {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
