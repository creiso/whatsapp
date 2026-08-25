-- Permite que os usuários criem seu próprio perfil
create policy "Permitir inserir perfil" on public.concord_profiles for insert with check (auth.uid() = id);

-- Permite que usuários autenticados criem grupos
create policy "Permitir criar grupo" on public.concord_groups for insert with check (auth.uid() = criado_por);

-- Permite que os usuários entrem nos grupos (via criação ou convite)
create policy "Permitir entrar no grupo" on public.concord_group_members for insert with check (auth.role() = 'authenticated');

-- Permite que Líder gerencie membros (promover, remover)
create policy "Lider pode atualizar membros" on public.concord_group_members for update using (
  exists (select 1 from public.concord_group_members m where m.group_id = concord_group_members.group_id and m.user_id = auth.uid() and m.papel = 'lider')
);
create policy "Lider e Mod podem remover" on public.concord_group_members for delete using (
  exists (select 1 from public.concord_group_members m where m.group_id = concord_group_members.group_id and m.user_id = auth.uid() and m.papel in ('lider', 'moderador'))
);

-- Políticas para os convites
create policy "Ver convites" on public.concord_invites for select using (auth.role() = 'authenticated');
create policy "Criar convites" on public.concord_invites for insert with check (
  exists (select 1 from public.concord_group_members m where m.group_id = concord_invites.group_id and m.user_id = auth.uid() and m.papel in ('lider', 'moderador'))
);
create policy "Atualizar convites (marcar usado)" on public.concord_invites for update using (auth.role() = 'authenticated');
