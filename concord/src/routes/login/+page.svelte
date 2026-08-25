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
