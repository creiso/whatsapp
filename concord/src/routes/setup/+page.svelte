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
  }
  .card {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 400px;
  }
  h2 { margin-top: 0; text-align: center; }
  .desc { text-align: center; font-size: 0.9rem; color: #4b5563; margin-bottom: 1.5rem; }
  .form-group { margin-bottom: 1rem; }
  label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
  input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
  button { width: 100%; padding: 0.75rem; background: #8b5cf6; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
  button:disabled { background: #c4b5fd; }
  .error { background: #fee2e2; color: #b91c1c; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; text-align: center; }
  .success { background: #d1fae5; color: #047857; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; text-align: center; font-weight: bold; }
  .btn-link { display: block; text-align: center; text-decoration: none; padding: 0.75rem; background: #2563eb; color: white; border-radius: 4px; font-weight: bold; }
</style>
