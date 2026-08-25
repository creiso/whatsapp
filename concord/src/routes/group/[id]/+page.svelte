<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/authStore';
  import { onMount } from 'svelte';
  
  const groupId = $page.params.id;
  
  let groupName = '';
  let myRole = '';
  let members: any[] = [];
  let loading = true;
  
  let inviteLink = '';
  let generatingInvite = false;
  
  onMount(async () => {
    if (!$user) return;
    
    // Fetch group details and my role
    const { data: myData } = await supabase
      .from('concord_group_members')
      .select('papel, concord_groups(nome)')
      .eq('group_id', groupId)
      .eq('user_id', $user.id)
      .single();
      
    if (myData) {
      myRole = myData.papel;
      groupName = myData.concord_groups.nome;
    }
    
    await loadMembers();
  });
  
  const loadMembers = async () => {
    loading = true;
    const { data } = await supabase
      .from('concord_group_members')
      .select('user_id, papel, concord_profiles(nome, email)')
      .eq('group_id', groupId);
      
    if (data) members = data;
    loading = false;
  };
  
  const generateInvite = async () => {
    if (myRole !== 'lider' && myRole !== 'moderador') return;
    
    generatingInvite = true;
    // Convite válido por 7 dias
    const expira = new Date();
    expira.setDate(expira.getDate() + 7);
    
    const { data, error } = await supabase
      .from('concord_invites')
      .insert({
        group_id: groupId,
        criado_por: $user?.id,
        expira_em: expira.toISOString()
      })
      .select()
    if (data) {
      let baseUrl = window.location.origin;
      
      // Se estiver rodando no aplicativo Desktop (Tauri usa localhost ou tauri://)
      if (baseUrl.includes('localhost') || baseUrl.includes('tauri')) {
        // Substitua este link pelo seu link oficial da Vercel!
        baseUrl = 'https://concord-git-main-meta-s-projects14.vercel.app'; 
      }
      
      inviteLink = `${baseUrl}/invite?token=${data.token}`;
    }
    generatingInvite = false;
  };
  
  const changeRole = async (memberId: string, newRole: string) => {
    if (myRole !== 'lider') return;
    
    await supabase
      .from('concord_group_members')
      .update({ papel: newRole })
      .eq('group_id', groupId)
      .eq('user_id', memberId);
      
    await loadMembers();
  };
  
  const removeMember = async (memberId: string, targetRole: string) => {
    // Líder pode remover qualquer um. Moderador pode remover apenas ligador.
    if (myRole === 'ligador') return;
    if (myRole === 'moderador' && targetRole !== 'ligador') return;
    
    await supabase
      .from('concord_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId);
      
    await loadMembers();
  };
</script>

<div class="container">
  <header>
    <div>
      <a href="/">&larr; Voltar</a>
      <h1>Gerenciar Grupo: {groupName}</h1>
      <span class="badge">Seu Papel: {myRole}</span>
    </div>
  </header>

  <main>
    {#if loading}
      <p>Carregando dados do grupo...</p>
    {:else}
      <section class="card">
        <h2>Membros ({members.length})</h2>
        <ul class="members-list">
          {#each members as member}
            <li class="member-item">
              <div class="member-info">
                <strong>{member.concord_profiles?.nome || 'Usuário Desconhecido'}</strong>
                <span class="role-badge {member.papel}">{member.papel}</span>
              </div>
              
              <div class="actions">
                {#if myRole === 'lider' && member.user_id !== $user?.id}
                  {#if member.papel === 'moderador' || member.papel === 'ligador'}
                    <button class="btn-small" on:click={() => changeRole(member.user_id, 'lider')}>Promover a Líder</button>
                  {/if}
                  {#if member.papel === 'ligador'}
                    <button class="btn-small" on:click={() => changeRole(member.user_id, 'moderador')}>Promover a Mod</button>
                  {/if}
                  {#if member.papel === 'moderador'}
                    <button class="btn-small" on:click={() => changeRole(member.user_id, 'ligador')}>Rebaixar a Ligador</button>
                  {/if}
                {/if}
                
                {#if (myRole === 'lider' || (myRole === 'moderador' && member.papel === 'ligador')) && member.user_id !== $user?.id}
                  <button class="btn-small btn-danger" on:click={() => removeMember(member.user_id, member.papel)}>Remover</button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>

      {#if myRole === 'lider' || myRole === 'moderador'}
        <section class="card">
          <h2>Convites</h2>
          <p>Convide novas pessoas para este grupo. O convite expira em 7 dias.</p>
          <button class="btn-primary" on:click={generateInvite} disabled={generatingInvite}>
            {generatingInvite ? 'Gerando...' : 'Gerar Link de Convite'}
          </button>
          
          {#if inviteLink}
            <div class="invite-box">
              <input type="text" readonly value={inviteLink} />
              <p class="help-text">Copie e envie para o convidado.</p>
            </div>
          {/if}
        </section>
      {/if}
    {/if}
  </main>
</div>

<style>
  .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
  header { margin-bottom: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; }
  header a { text-decoration: none; color: #4b5563; font-weight: bold; margin-bottom: 0.5rem; display: inline-block; }
  h1 { margin: 0.5rem 0; }
  .badge { background: #e0e7ff; color: #4338ca; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; font-weight: bold; }
  
  .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
  .card h2 { margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.5rem; }
  
  .members-list { list-style: none; padding: 0; margin: 0; }
  .member-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid #f3f4f6; }
  .member-item:last-child { border-bottom: none; }
  .member-info { display: flex; align-items: center; gap: 1rem; }
  
  .role-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
  .role-badge.lider { background: #fee2e2; color: #991b1b; }
  .role-badge.moderador { background: #fef3c7; color: #92400e; }
  .role-badge.ligador { background: #e0e7ff; color: #3730a3; }
  
  .actions { display: flex; gap: 0.5rem; }
  .btn-small { padding: 0.25rem 0.5rem; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
  .btn-danger { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }
  
  .btn-primary { padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
  .invite-box { margin-top: 1rem; padding: 1rem; background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 4px; }
  .invite-box input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 0.5rem; }
  .help-text { margin: 0; font-size: 0.875rem; color: #6b7280; }
</style>
