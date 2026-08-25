<script lang="ts">
  import { onMount } from 'svelte';
  import { initAuth, user, loading } from '$lib/authStore';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let initialized = false;

  onMount(() => {
    initAuth();
    initialized = true;
  });

  // Guard routing logic
  $: if (initialized && !$loading) {
    const publicOnlyRoutes = ['/login', '/register', '/setup'];
    const sharedRoutes = ['/invite'];
    
    if (!$user && !publicOnlyRoutes.includes($page.url.pathname) && !sharedRoutes.includes($page.url.pathname)) {
      goto('/login');
    } else if ($user && publicOnlyRoutes.includes($page.url.pathname)) {
      goto('/');
    }
  }
</script>

<style>
  :global(:root) {
    --bg-dark: #0a0a0a;
    --bg-card: #171717;
    --text-main: #f9fafb;
    --text-muted: #9ca3af;
    --accent-purple: #9333ea;
    --accent-purple-hover: #7e22ce;
    --accent-red: #ef4444;
    --accent-red-hover: #dc2626;
    --accent-gold: #fbbf24;
    --border-color: #262626;
  }
  :global(body) {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg-dark);
    color: var(--text-main);
  }
  :global(a) { color: var(--accent-purple); text-decoration: none; transition: color 0.2s; }
  :global(a:hover) { color: var(--accent-purple-hover); }
  
  :global(button) { transition: all 0.2s ease-in-out; }
  :global(button:hover) { transform: translateY(-1px); }
  
  :global(input) {
    background: #262626;
    color: white;
    border: 1px solid var(--border-color);
  }
  :global(input:focus) {
    outline: none;
    border-color: var(--accent-purple);
    box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.2);
  }
</style>

<main>
  {#if $loading}
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;">
      Carregando...
    </div>
  {:else}
    <slot />
  {/if}
</main>
