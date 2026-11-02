import { describe, it, expect, beforeEach } from 'vitest'
import { assertPublicAnonKeyOnly } from '@/lib/supabase'
import {
  verifyServerJwt,
  validateServerInput,
  checkRateLimit,
  resetRateLimitStore,
  buildStrictCorsHeaders,
  redactSecrets,
  buildGenericClientError,
} from '@/server/security'
import { transactionSchema } from '@/lib/validations/transaction'
import * as dbSchema from '@/db/schema'

describe('Arquitetura de Segurança Supabase (Regras 1 a 7)', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  describe('Regra 1: Proteção contra chave secreta no Front-end', () => {
    it('permite chaves públicas anon / sb_publishable_', () => {
      expect(() =>
        assertPublicAnonKeyOnly('sb_publishable_example_public_key_12345')
      ).not.toThrow()
    })

    it('bloqueia imediatamente chaves sb_secret_ ou service_role no front-end', () => {
      expect(() => assertPublicAnonKeyOnly('sb_secret_super_secret_key')).toThrow(
        /VIOLAÇÃO DE SEGURANÇA/
      )
      expect(() => assertPublicAnonKeyOnly('service_role_key_example')).toThrow(
        /VIOLAÇÃO DE SEGURANÇA/
      )
    })

    it('bloqueia JWT contendo role=service_role no front-end', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({ role: 'service_role', iss: 'supabase' }))
      const fakeServiceRoleJwt = `${header}.${payload}.signature`

      expect(() => assertPublicAnonKeyOnly(fakeServiceRoleJwt)).toThrow(
        /VIOLAÇÃO DE SEGURANÇA/
      )
    })
  })

  describe('Regra 3: Drizzle ORM Schema Tipado', () => {
    it('exporta todas as tabelas do domínio financeiro sem SQL concatenado', () => {
      expect(dbSchema.profiles).toBeDefined()
      expect(dbSchema.accounts).toBeDefined()
      expect(dbSchema.categories).toBeDefined()
      expect(dbSchema.transactions).toBeDefined()
      expect(dbSchema.creditCards).toBeDefined()
      expect(dbSchema.cardInvoices).toBeDefined()
      expect(dbSchema.installments).toBeDefined()
      expect(dbSchema.projects).toBeDefined()
      expect(dbSchema.realEstateProperties).toBeDefined()
      expect(dbSchema.realEstateAmortizations).toBeDefined()
      expect(dbSchema.goals).toBeDefined()
      expect(dbSchema.assets).toBeDefined()
      expect(dbSchema.investments).toBeDefined()
      expect(dbSchema.investmentTransactions).toBeDefined()
      expect(dbSchema.liabilities).toBeDefined()
      expect(dbSchema.auditLog).toBeDefined()
    })
  })

  describe('Regra 4 e 5: Validação Zod no Servidor (400) e user_id exclusivo do JWT', () => {
    it('rejeita com status 400 entradas inválidas no servidor', () => {
      const result = validateServerInput(
        transactionSchema,
        {
          kind: 'expense',
          description: '',
          amount: -50,
          account_id: 'nao-e-uuid',
        },
        '11111111-1111-4111-8111-111111111111'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.status).toBe(400)
        expect(result.body.details.length).toBeGreaterThan(0)
      }
    })

    it('ignora e sobrescreve qualquer user_id enviado maliciosamente pelo cliente usando o user_id do JWT', () => {
      const jwtUserId = '11111111-1111-4111-8111-111111111111'
      const attackerUserId = '99999999-9999-4999-8999-999999999999'

      const result = validateServerInput(
        transactionSchema,
        {
          user_id: attackerUserId,
          userId: attackerUserId,
          kind: 'income',
          description: 'Salário Mensal',
          amount: 5000,
          account_id: 'a0000000-0000-4000-8000-000000000001',
          status: 'completed',
          due_date: '2026-11-05',
        },
        jwtUserId
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.user_id).toBe(jwtUserId)
        expect(result.data.user_id).not.toBe(attackerUserId)
      }
    })

    it('valida o JWT no servidor e rejeita requisições sem Bearer token válido com 401', async () => {
      const fakeSupabaseAdmin = {
        auth: {
          getUser: async (token: string) => {
            if (token === 'valid_jwt_token_with_more_than_20_chars') {
              return {
                data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
                error: null,
              }
            }
            return { data: { user: null }, error: new Error('Invalid JWT') }
          },
        },
      } as unknown as Parameters<typeof verifyServerJwt>[1]

      const missing = await verifyServerJwt(null, fakeSupabaseAdmin)
      expect('errorResponse' in missing && missing.errorResponse.status).toBe(401)

      const valid = await verifyServerJwt(
        'Bearer valid_jwt_token_with_more_than_20_chars',
        fakeSupabaseAdmin
      )
      expect('userId' in valid && valid.userId).toBe(
        '11111111-1111-4111-8111-111111111111'
      )
    })
  })

  describe('Regra 7: Rate Limiting, CORS Restrito, Erros Genéricos e Redação de Segredos', () => {
    it('aplica rate limiting bloqueando excesso de requisições na janela', () => {
      const ip = '192.168.1.50'
      expect(checkRateLimit(ip, { maxRequests: 2, windowMs: 60_000, now: 1000 }).allowed).toBe(
        true
      )
      expect(checkRateLimit(ip, { maxRequests: 2, windowMs: 60_000, now: 2000 }).allowed).toBe(
        true
      )
      const third = checkRateLimit(ip, { maxRequests: 2, windowMs: 60_000, now: 3000 })
      expect(third.allowed).toBe(false)
      expect(third.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('restringe CORS exclusivamente ao domínio autorizado do site', () => {
      const allowedHeaders = buildStrictCorsHeaders(
        'https://financeflow.app',
        'https://financeflow.app'
      )
      expect(allowedHeaders['Access-Control-Allow-Origin']).toBe('https://financeflow.app')

      const blockedHeaders = buildStrictCorsHeaders(
        'https://malicious-site.com',
        'https://financeflow.app'
      )
      expect(blockedHeaders['Access-Control-Allow-Origin']).toBeUndefined()
    })

    it('mascara tokens Bearer, chaves sb_secret_ e senhas antes de qualquer log', () => {
      const rawLog =
        'Header Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig key=sb_secret_987654321 password= MinhaSenha123!'
      const safeLog = redactSecrets(rawLog)

      expect(safeLog).not.toContain('sb_secret_987654321')
      expect(safeLog).not.toContain('MinhaSenha123!')
      expect(safeLog).toContain('[REDACTED]')
    })

    it('retorna mensagens de erro genéricas sem expor detalhes internos', () => {
      const err500 = buildGenericClientError(500)
      expect(err500.status).toBe(500)
      expect(err500.body.error).toBe(
        'Não foi possível processar sua solicitação no momento.'
      )
    })
  })
})

