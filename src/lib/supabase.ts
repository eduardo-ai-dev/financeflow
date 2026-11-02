import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis ausentes: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local (veja .env.example).'
  )
}

/**
 * Garante em tempo de execução que uma chave secreta (service_role / sb_secret_)
 * jamais seja injetada por engano no bundle de front-end (Regra de Segurança 1).
 */
export function assertPublicAnonKeyOnly(key: string): void {
  const trimmed = key.trim()

  if (trimmed.startsWith('sb_secret_') || /service_role/i.test(trimmed)) {
    throw new Error(
      'VIOLAÇÃO DE SEGURANÇA: Uma chave secreta (service_role / sb_secret_) foi detectada no front-end. Use exclusivamente a chave pública (anon / publishable).'
    )
  }

  // Se for um JWT (3 partes separadas por ponto), inspeciona o payload para bloquear role=service_role
  const parts = trimmed.split('.')
  if (parts.length === 3) {
    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      const payload = JSON.parse(payloadJson) as { role?: string }
      if (payload.role === 'service_role') {
        throw new Error(
          'VIOLAÇÃO DE SEGURANÇA: JWT com role=service_role detectado no front-end. Use apenas a chave anon.'
        )
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('VIOLAÇÃO DE SEGURANÇA')) {
        throw err
      }
    }
  }
}

assertPublicAnonKeyOnly(supabaseAnonKey)

/**
 * Cliente único do Supabase (browser).
 * Usa exclusivamente a chave pública (anon/publishable): o isolamento dos dados
 * é garantido pelas políticas de RLS no banco e pelo JWT do Supabase Auth.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
