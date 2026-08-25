-- Perfis (complementa auth.users do Supabase)
create table if not exists public.concord_profiles (
  id uuid references auth.users(id) primary key,
  nome text not null,
  criado_em timestamptz default now()
);

-- Grupos
create table if not exists public.concord_groups (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid references public.concord_profiles(id) not null,
  criado_em timestamptz default now()
);

-- Papel dentro do grupo
-- Para evitar problemas com enum se já existir, usamos if not exists
DO $$ BEGIN
    CREATE TYPE concord_group_role AS ENUM ('lider', 'moderador', 'ligador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.concord_group_members (
  group_id uuid references public.concord_groups(id) on delete cascade,
  user_id uuid references public.concord_profiles(id) on delete cascade,
  papel concord_group_role not null default 'ligador',
  entrou_em timestamptz default now(),
  primary key (group_id, user_id)
);

-- Convites
create table if not exists public.concord_invites (
  token uuid primary key default gen_random_uuid(),
  group_id uuid references public.concord_groups(id) on delete cascade,
  criado_por uuid references public.concord_profiles(id) not null,
  usado boolean default false,
  expira_em timestamptz not null,
  criado_em timestamptz default now()
);

-- RLS
alter table public.concord_profiles enable row level security;
alter table public.concord_groups enable row level security;
alter table public.concord_group_members enable row level security;
alter table public.concord_invites enable row level security;

-- Drop policies se existirem (para permitir rodar várias vezes)
drop policy if exists "Ver perfis concord" on public.concord_profiles;
drop policy if exists "Ver próprios grupos" on public.concord_groups;
drop policy if exists "Ver membros do grupo" on public.concord_group_members;

-- Políticas Básicas (vamos expandir depois)
create policy "Ver perfis concord" on public.concord_profiles for select using (auth.role() = 'authenticated');
create policy "Ver próprios grupos" on public.concord_groups for select using (
  exists (select 1 from public.concord_group_members m where m.group_id = id and m.user_id = auth.uid())
);
create policy "Ver membros do grupo" on public.concord_group_members for select using (
  exists (select 1 from public.concord_group_members m where m.group_id = concord_group_members.group_id and m.user_id = auth.uid())
);
-- Habilitar realtime para chamadas no Supabase
begin;
  -- Verifica se a tabela groups está no realtime publication
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.concord_groups, public.concord_group_members;
commit;
