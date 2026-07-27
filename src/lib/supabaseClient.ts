import { createClient } from '@supabase/supabase-js';

// NOTA: Como solicitado, estamos configurando temporariamente fora do padrão estrito de variáveis de ambiente do Next.js (NEXT_PUBLIC_...).
// Você pode substituir estas strings diretamente pelas suas credenciais do Supabase para iniciar os testes.
// Depois, migraremos para .env.local para maior segurança em produção.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'COLOQUE_SUA_URL_AQUI';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'COLOQUE_SUA_CHAVE_ANON_AQUI';

export const supabase = createClient(supabaseUrl, supabaseKey);
