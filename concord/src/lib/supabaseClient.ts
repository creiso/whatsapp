import { createClient } from '@supabase/supabase-js';

// Usando variáveis de ambiente do SvelteKit ($env/static/public) ou import.meta.env
// Para compatibilidade com Tauri + Vite, usamos import.meta.env, que precisam ter o prefixo VITE_
// Portanto, certifique-se de usar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu .env

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltam credenciais do Supabase. Verifique o arquivo .env.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key'
);
