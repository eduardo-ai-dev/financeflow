import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

declare const process: {
  env: Record<string, string | undefined>
}

/**
 * ============================================================================
 * Camada de Segurança Back-end (Regras 1, 2, 4, 5 e 7)
 *
 * IMPORTANTE: Este módulo é EXCLUSIVO de servidor (Node.js / Edge Functions).
 * A função `assertServerEnvironment()` bloqueia imediatamente qualquer
 * execução caso seja importado acidentalmente no navegador.
 * ============================================================================
 */

export function assertServerEnvironment(): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    throw new Error(
      'VIOLAÇÃO DE SEGURANÇA: O módulo de servidor (src/server/security.ts) jamais pode ser executado no navegador.'
    )
  }
}

/**
 * Regra 1 e 2: Cria cliente privilegiado do Supabase APENAS no back-end,
 * lendo exclusivamente de `process.env` (sem prefixo VITE_ ou NEXT_PUBLIC_).
 */
export function createServerSupabaseAdmin(
  env: Record<string, string | undefined> = process.env
): SupabaseClient {
  assertServerEnvironment()

  const supabaseUrl = env.SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração de servidor incompleta.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Regra 5: Valida o JWT do cabeçalho Authorization diretamente no Supabase Auth
 * e retorna o `userId` autenticado. NUNCA aceita `user_id` enviado pelo cliente.
 */
export async function verifyServerJwt(
  authHeader: string | null | undefined,
  supabaseAdmin: Pick<SupabaseClient, 'auth'>
): Promise<{ userId: string } | { errorResponse: { status: 401; body: { error: string } } }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      errorResponse: {
        status: 401,
        body: { error: 'Não autorizado: token ausente.' },
      },
    }
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token || token.length < 20) {
    return {
      errorResponse: {
        status: 401,
        body: { error: 'Não autorizado: token inválido.' },
      },
    }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user?.id) {
    return {
      errorResponse: {
        status: 401,
        body: { error: 'Sessão inválida ou expirada.' },
      },
    }
  }

  return { userId: data.user.id }
}

/**
 * Regra 4 e 5: Valida TODA entrada no servidor com Zod (tipos, tamanhos máximos,
 * formatos, allowlist), remove qualquer `user_id` vindo do cliente e rejeita
 * com HTTP 400 o que não passar.
 */
export function validateServerInput<T extends z.ZodTypeAny>(
  schema: T,
  rawPayload: unknown,
  authenticatedUserId: string
):
  | {
      ok: true
      data: z.infer<T> & { user_id: string }
    }
  | {
      ok: false
      status: 400
      body: { error: string; details: Array<{ field: string; message: string }> }
    } {
  // Remove qualquer tentativa do cliente de injetar user_id ou userId no body
  const sanitizedInput =
    rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? (() => {
          const clone = { ...(rawPayload as Record<string, unknown>) }
          delete clone.user_id
          delete clone.userId
          return clone
        })()
      : rawPayload

  const parsed = schema.safeParse(sanitizedInput)
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'Dados de entrada inválidos.',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'payload',
          message: issue.message,
        })),
      },
    }
  }

  return {
    ok: true,
    data: {
      ...(parsed.data as Record<string, unknown>),
      user_id: authenticatedUserId,
    } as z.infer<T> & { user_id: string },
  }
}

/**
 * Regra 7: Rate Limiting em memória (sliding window) para rotas sensíveis.
 */
interface RateLimitBucket {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitBucket>()

export function checkRateLimit(
  identifier: string,
  options: { maxRequests?: number; windowMs?: number; now?: number } = {}
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const maxRequests = options.maxRequests ?? 30
  const windowMs = options.windowMs ?? 60_000
  const now = options.now ?? Date.now()
  const windowStart = now - windowMs

  const bucket = rateLimitStore.get(identifier) ?? { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart)

  if (bucket.timestamps.length >= maxRequests) {
    const oldestInWindow = bucket.timestamps[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000))
    rateLimitStore.set(identifier, bucket)
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    }
  }

  bucket.timestamps.push(now)
  rateLimitStore.set(identifier, bucket)

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxRequests - bucket.timestamps.length),
  }
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear()
}

/**
 * Regra 7: CORS restrito estritamente ao domínio configurado do site.
 * Jamais retorna '*' para rotas autenticadas ou sensíveis.
 */
export function buildStrictCorsHeaders(
  requestOrigin: string | null | undefined,
  allowedOrigin: string = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
): Record<string, string> {
  const normalizedAllowed = allowedOrigin.trim().replace(/\/+$/, '')
  const normalizedRequest = (requestOrigin || '').trim().replace(/\/+$/, '')

  const isAllowed = normalizedRequest !== '' && normalizedRequest === normalizedAllowed

  if (!isAllowed) {
    return {
      Vary: 'Origin',
    }
  }

  return {
    'Access-Control-Allow-Origin': normalizedAllowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info, Apikey',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/**
 * Regra 7: Mascara segredos (tokens Bearer, chaves sb_secret_, senhas e JWTs)
 * para garantir que logs nunca exponham credenciais.
 */
export function redactSecrets(input: string): string {
  return input
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, 'sb_secret_[REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]')
    .replace(/(password|secret|service_role|apikey)\s*[:=]\s*[^\s,&"']+/gi, '$1=[REDACTED]')
}

/**
 * Regra 7: Retorna sempre erros genéricos para o cliente (sem expor stack trace,
 * nomes de constraints internas ou detalhes do banco).
 */
export function buildGenericClientError(status: 400 | 401 | 403 | 404 | 429 | 500 = 500): {
  status: number
  body: { error: string }
} {
  const messages: Record<number, string> = {
    400: 'Requisição inválida. Verifique os dados enviados.',
    401: 'Não autorizado. Faça login novamente.',
    403: 'Acesso negado a este recurso.',
    404: 'Recurso não encontrado.',
    429: 'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.',
    500: 'Não foi possível processar sua solicitação no momento.',
  }

  return {
    status,
    body: {
      error: messages[status] || messages[500],
    },
  }
}
