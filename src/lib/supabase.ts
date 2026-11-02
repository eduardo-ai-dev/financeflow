import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis ausentes: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local (veja .env.example).',
  )
}

/**
 * Cliente único do Supabase (browser).
 * Usa apenas a chave pública (anon/publishable): a segurança dos dados é
 * garantida pelas políticas de RLS no banco — nunca coloque a service_role aqui.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

