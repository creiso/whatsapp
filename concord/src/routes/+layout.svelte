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
    const publicRoutes = ['/login', '/register', '/setup'];
    if (!$user && !publicRoutes.includes($page.url.pathname)) {
      goto('/login');
    } else if ($user && publicRoutes.includes($page.url.pathname)) {
      goto('/');
    }
  }
</script>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #f3f4f6;
    color: #111827;
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
