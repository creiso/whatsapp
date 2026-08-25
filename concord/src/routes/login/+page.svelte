<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  
  let email = '';
  let password = '';
  let loading = false;
  let errorMsg = '';

  const handleLogin = async () => {
    loading = true;
    errorMsg = '';
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      errorMsg = error.message;
    }
    loading = false;
  };
</script>

<div class="container">
  <div class="card">
    <h2>Login no Concord</h2>
    {#if errorMsg}
      <div class="error">{errorMsg}</div>
    {/if}
    
    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="email">E-mail</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      
      <div class="form-group">
        <label for="password">Senha</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
    
    <div class="footer">
      <p>Ainda não tem conta? <a href="/register">Cadastre-se com um convite</a></p>
    </div>
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
  h2 {
    margin-top: 0;
    text-align: center;
  }
  .form-group {
    margin-bottom: 1rem;
  }
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  }
  button {
    width: 100%;
    padding: 0.75rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
  }
  button:disabled {
    background: #93c5fd;
  }
  .error {
    background: #fee2e2;
    color: #b91c1c;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    text-align: center;
  }
  .footer {
    margin-top: 1rem;
    text-align: center;
    font-size: 0.875rem;
  }
</style>
