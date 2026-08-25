<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/authStore';
  import { onMount } from 'svelte';
  
  let groups: any[] = [];
  let loading = true;
  
  const loadGroups = async () => {
    loading = true;
    const { data, error } = await supabase
      .from('concord_group_members')
      .select(`
        papel,
        concord_groups (
          id,
          nome,
          criado_em
        )
      `)
      .eq('user_id', $user?.id);
      
    if (!error && data) {
      groups = data;
    }
    loading = false;
  };
  
  onMount(async () => {
    if (!$user) return;
    await loadGroups();
  });
  
  let newGroupName = '';
  let creatingGroup = false;

  let groupErrorMsg = '';

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !$user) return;
    
    creatingGroup = true;
    groupErrorMsg = '';
    
    // Garante que o perfil existe (útil se a conta foi criada pelo painel manualmente)
    const { data: profile, error: profileErr } = await supabase.from('concord_profiles').select('id').eq('id', $user.id).single();
    if (!profile) {
      const { error: insertProfileErr } = await supabase.from('concord_profiles').insert({ id: $user.id, nome: $user.email?.split('@')[0] || 'Usuário' });
      if (insertProfileErr) {
        groupErrorMsg = `Erro ao criar perfil: ${insertProfileErr.message}`;
        creatingGroup = false;
        return;
      }
    }
    
    // Cria o grupo
    const { data: groupData, error: groupError } = await supabase
      .from('concord_groups')
      .insert({ nome: newGroupName, criado_por: $user.id })
      .select()
      .single();
      
    if (groupError) {
      groupErrorMsg = `Erro ao criar grupo: ${groupError.message}`;
      creatingGroup = false;
      return;
    }
      
    if (groupData) {
      // Adiciona o criador como Líder
      const { error: memberError } = await supabase
        .from('concord_group_members')
        .insert({ group_id: groupData.id, user_id: $user.id, papel: 'lider' });
        
      if (memberError) {
         groupErrorMsg = `Erro ao vincular você ao grupo: ${memberError.message}`;
      } else {
        newGroupName = '';
        await loadGroups(); // Recarrega a lista
      }
    }
    
    creatingGroup = false;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
</script>

<div class="dashboard">
  <header>
    <h1>Concord - Meus Grupos</h1>
    <div class="user-info">
      <span>{$user?.email}</span>
      <button on:click={handleLogout} class="logout-btn">Sair</button>
    </div>
  </header>
  
  <main>
    <div class="create-group-card">
      <h2>Criar Novo Grupo</h2>
      {#if groupErrorMsg}
        <div class="error" style="background:#fee2e2;color:#b91c1c;padding:0.5rem;margin-bottom:1rem;border-radius:4px;">
          {groupErrorMsg}
        </div>
      {/if}
      <form on:submit|preventDefault={handleCreateGroup} class="create-form">
        <input type="text" bind:value={newGroupName} placeholder="Nome do Grupo" required />
        <button type="submit" disabled={creatingGroup}>
          {creatingGroup ? 'Criando...' : 'Criar Grupo'}
        </button>
      </form>
    </div>

    {#if loading}
      <p>Carregando seus grupos...</p>
    {:else if groups.length === 0}
      <div class="empty-state">
        <p>Você ainda não está em nenhum grupo.</p>
        <p>Crie um acima ou peça um convite a um líder!</p>
      </div>
    {:else}
      <div class="grid">
        {#each groups as member}
          <div class="group-card">
            <h3>{member.concord_groups.nome}</h3>
            <p>Seu Papel: <strong>{member.papel}</strong></p>
            <a href="/call/{member.concord_groups.id}" class="join-btn" style="text-align: center; text-decoration: none; display: block;">Entrar na Sala</a>
            <a href="/group/{member.concord_groups.id}" class="manage-btn" style="text-align: center; text-decoration: none; display: block;">Gerenciar</a>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .dashboard {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
    margin-bottom: 2rem;
  }
  h1 {
    margin: 0;
    color: #111827;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .logout-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .empty-state {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .create-group-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }
  .create-group-card h2 { margin-top: 0; font-size: 1.25rem; }
  .create-form { display: flex; gap: 1rem; }
  .create-form input { flex: 1; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; }
  .create-form button { padding: 0.75rem 1.5rem; background: #8b5cf6; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
  .create-form button:disabled { background: #c4b5fd; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  .group-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .group-card h3 {
    margin: 0 0 0.5rem 0;
  }
  .join-btn {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
  }
  .manage-btn {
    padding: 0.5rem;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
