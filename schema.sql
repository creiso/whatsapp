-- Tabela de Perfis de Usuário (Admin e Vendedores)
-- Esta tabela será vinculada à tabela nativa auth.users do Supabase
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'AGENT')),
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Equipes (Teams)
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vínculo entre Vendedores (Agents) e Equipes (Teams)
CREATE TABLE public.agent_teams (
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, team_id)
);

-- Tabela de Contatos (Leads)
CREATE TABLE public.contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL, -- DDI + DDD + Numero
  name TEXT,
  dynamic_fields JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXCEPTION', 'QUARANTINE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Campanhas
CREATE TABLE public.campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  meta_template_id TEXT NOT NULL,
  meta_template_name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Conversas (onde ocorre o Lock e atribuição de Lead a Vendedor)
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE UNIQUE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Se NULL, está na fila de espera
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Mensagens (O Feed de Mensagens do Chat)
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  content TEXT,
  meta_message_id TEXT UNIQUE, -- ID da mensagem no Meta (para webhook receipt)
  status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Exemplo simples de Políticas (RLS)
-- Nota: Para um sistema real, o Admin terá bypass (usando custom claims ou check de role).
-- Abaixo, permitimos select para quem estiver autenticado como base inicial.
CREATE POLICY "Admins e Agents podem ver perfis" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins e Agents podem ver times" ON public.teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins e Agents podem ver contatos" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents veem apenas suas conversas ou da sua equipe" ON public.conversations FOR SELECT USING (
  agent_id = auth.uid() OR agent_id IS NULL
);
CREATE POLICY "Mensagens visíveis para o dono da conversa" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id AND (c.agent_id = auth.uid() OR c.agent_id IS NULL)
  )
);
