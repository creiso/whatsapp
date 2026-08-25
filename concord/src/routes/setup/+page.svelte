<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  
  let name = '';
  let email = '';
  let password = '';
  let loading = false;
  let errorMsg = '';
  let successMsg = '';

  const handleSetup = async () => {
    loading = true;
    errorMsg = '';
    successMsg = '';
    
    // 1. Criar a conta no Supabase Auth
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
      // 2. Inserir no concord_profiles
      const { error: profileError } = await supabase
        .from('concord_profiles')
        .insert({ id: authData.user.id, nome: name });
        
      if (profileError) {
        errorMsg = 'Erro ao criar perfil. Verifique se o RLS permite a inserção ou se já existe.';
        loading = false;
        return;
      }
      
      // 3. Criar um grupo base
      const { data: groupData, error: groupError } = await supabase
        .from('concord_groups')
        .insert({ nome: 'Grupo Inicial (Concord)', criado_por: authData.user.id })
        .select()
        .single();

      if (groupError) {
        errorMsg = 'Conta criada, mas falhou ao criar o grupo inicial.';
        loading = false;
        return;
      }
      
      // 4. Inserir como Líder do grupo
      await supabase
        .from('concord_group_members')
        .insert({ group_id: groupData.id, user_id: authData.user.id, papel: 'lider' });
        
      successMsg = 'Setup concluído! Agora você pode ir para a tela de login.';
    }
    
    loading = false;
  };
</script>

<div class="container">
  <div class="card">
    <h2>Primeiro Setup (Admin)</h2>
    <p class="desc">Crie o primeiro Líder e o primeiro Grupo para poder gerar convites.</p>
    
    {#if errorMsg}
      <div class="error">{errorMsg}</div>
    {/if}
    
    {#if successMsg}
      <div class="success">{successMsg}</div>
      <a href="/login" class="btn-link">Ir para o Login</a>
    {:else}
      <form on:submit|preventDefault={handleSetup}>
        <div class="form-group">
          <label for="name">Nome do Líder</label>
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
          {loading ? 'Configurando...' : 'Criar Conta e Grupo Inicial'}
        </button>
      </form>
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
  .desc { text-align: center; font-size: 0.9rem; color: #4b5563; margin-bottom: 1.5rem; }
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
    border: 1px solid #ccc;
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
  .success { background: #d1fae5; color: #047857; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; text-align: center; font-weight: bold; }
  .btn-link { display: block; text-align: center; text-decoration: none; padding: 0.75rem; background: #2563eb; color: white; border-radius: 4px; font-weight: bold; }
</style>
