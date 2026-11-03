import { describe, it, expect } from 'vitest'
import { vaultSchema, vaultTransferSchema, VAULT_PURPOSES } from '../validations/vault'
import { MODULE_GROUPS } from '@/config/modules'

describe('Validação de Cofres e Reservas (Zod)', () => {
  it('deve validar dados válidos para criação de um cofre', () => {
    const validData = {
      name: 'Reserva de Emergência 6 Meses',
      purpose: 'emergency' as const,
      color: '#10b981',
      liquidity: 'daily' as const,
      target_amount: 30000,
      opening_balance: 5000,
      notes: 'Fundo para cobrir 6 meses de despesas fixas',
    }

    const parsed = vaultSchema.safeParse(validData)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.name).toBe('Reserva de Emergência 6 Meses')
      expect(parsed.data.purpose).toBe('emergency')
      expect(parsed.data.target_amount).toBe(30000)
      expect(parsed.data.opening_balance).toBe(5000)
    }
  })

  it('deve rejeitar nome muito curto ou vazio', () => {
    const invalid = {
      name: '',
      purpose: 'opportunity' as const,
      color: '#3b82f6',
      liquidity: 'daily' as const,
      target_amount: 0,
      opening_balance: 0,
    }

    const parsed = vaultSchema.safeParse(invalid)
    expect(parsed.success).toBe(false)
  })

  it('deve conter todos os propósitos oficiais de cofre', () => {
    const values = VAULT_PURPOSES.map((p) => p.value)
    expect(values).toContain('emergency')
    expect(values).toContain('opportunity')
    expect(values).toContain('taxes')
    expect(values).toContain('goals')
    expect(values).toContain('free')
  })

  it('deve validar transferências entre contas e cofres', () => {
    const validTransfer = {
      vault_id: '123e4567-e89b-12d3-a456-426614174000',
      account_id: '987fcdeb-51a2-43f7-9876-ba9876543210',
      amount: 1500.5,
      date: '2026-11-02',
      notes: 'Aporte mensal do cofre',
    }

    const parsed = vaultTransferSchema.safeParse(validTransfer)
    expect(parsed.success).toBe(true)
  })

  it('deve rejeitar transferência com valor menor ou igual a zero', () => {
    const invalidTransfer = {
      vault_id: '123e4567-e89b-12d3-a456-426614174000',
      account_id: '987fcdeb-51a2-43f7-9876-ba9876543210',
      amount: 0,
      date: '2026-11-02',
    }

    const parsed = vaultTransferSchema.safeParse(invalidTransfer)
    expect(parsed.success).toBe(false)
  })
})

describe('Integridade da Navegação e Menu Retrátil (Sidebar Groups)', () => {
  it('deve conter exatamente as 5 seções solicitadas pela arquitetura', () => {
    const groupNames = MODULE_GROUPS.map((g) => g.name)
    expect(groupNames).toEqual([
      'Visão Geral',
      'Fluxo de Caixa',
      'Patrimônio & Objetivos',
      'Estratégia & Análise',
      'Sistema',
    ])
  })

  it('deve mapear os 25 módulos sem rotas duplicadas', () => {
    const allPaths = MODULE_GROUPS.flatMap((g) => g.items.map((i) => i.path))
    expect(allPaths.length).toBe(25)

    const uniquePaths = new Set(allPaths)
    expect(uniquePaths.size).toBe(25)
  })

  it('deve conter as novas rotas avançadas', () => {
    const allPaths = MODULE_GROUPS.flatMap((g) => g.items.map((i) => i.path))
    expect(allPaths).toContain('/contas-a-pagar')
    expect(allPaths).toContain('/recorrencias')
    expect(allPaths).toContain('/transferencias')
    expect(allPaths).toContain('/dividas')
    expect(allPaths).toContain('/cofres')
    expect(allPaths).toContain('/simuladores')
    expect(allPaths).toContain('/documentos')
    expect(allPaths).toContain('/notificacoes')
  })
})
