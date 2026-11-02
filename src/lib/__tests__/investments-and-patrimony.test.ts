import { describe, it, expect } from 'vitest'
import { investmentSchema, investmentTxSchema } from '@/lib/validations/investment'
import { liabilitySchema } from '@/lib/validations/liability'
import { calculatePatrimonySummary } from '@/lib/patrimony'
import { toCents, fromCents, subtractCents, sumCents } from '@/lib/money'
import type { Account, Investment, Asset, RealEstateProperty, Liability } from '@/types/database'

describe('Fase 6 — Validações de Investimentos e Passivos', () => {
  it('valida investimento em renda fixa com campos corretos', () => {
    const valid = {
      name: 'Tesouro IPCA+ 2029',
      ticker: 'IPCA29',
      type: 'fixed_income',
      institution: 'XP Investimentos',
      initial_amount: 10000,
      total_invested: 10000,
      current_amount: 10550,
      start_date: '2026-01-15',
      liquidity: 'at_maturity',
      benchmark: 'IPCA',
      rate: 'IPCA + 6.2%',
    }
    const result = investmentSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('valida movimentação de aporte em investimento', () => {
    const validTx = {
      investment_id: 'a0000000-0000-4000-8000-000000000001',
      type: 'contribution',
      amount: 1500,
      date: '2026-05-10',
    }
    const result = investmentTxSchema.safeParse(validTx)
    expect(result.success).toBe(true)
  })

  it('rejeita movimentação com valor menor ou igual a zero', () => {
    const invalidTx = {
      investment_id: 'a0000000-0000-4000-8000-000000000001',
      type: 'contribution',
      amount: 0,
      date: '2026-05-10',
    }
    const result = investmentTxSchema.safeParse(invalidTx)
    expect(result.success).toBe(false)
  })

  it('valida cadastro de passivo financeiro', () => {
    const validLiab = {
      name: 'Empréstimo Consignado',
      type: 'loan',
      total_amount: 20000,
      current_balance: 14500,
      monthly_payment: 850,
      remaining_installments: 18,
    }
    const result = liabilitySchema.safeParse(validLiab)
    expect(result.success).toBe(true)
  })
})

describe('Fase 6 — Motor Matemático do Balanço Patrimonial (Regra 1 e 4)', () => {
  it('calcula patrimônio líquido exato: Ativos - Passivos', () => {
    const accounts: Account[] = [
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Conta Corrente',
        type: 'checking',
        institution: 'Nubank',
        opening_balance: 5000,
        opened_on: '2026-01-01',
        color: '#000',
        icon: 'Wallet',
        is_archived: false,
        created_at: '',
        updated_at: '',
      },
    ]

    const investments: Investment[] = [
      {
        id: 'inv-1',
        user_id: 'user-1',
        name: 'CDB 100% CDI',
        ticker: null,
        type: 'fixed_income',
        institution: 'Nubank',
        initial_amount: 15000,
        total_invested: 15000,
        current_amount: 16200,
        start_date: '2026-01-01',
        due_date: null,
        liquidity: 'daily',
        benchmark: 'CDI',
        rate: '100% CDI',
        notes: null,
        created_at: '',
        updated_at: '',
      },
    ]

    const assets: Asset[] = [
      {
        id: 'asset-1',
        user_id: 'user-1',
        name: 'Carro',
        type: 'vehicle',
        acquisition_value: 45000,
        current_value: 42000,
        acquisition_date: '2025-01-01',
        goal_id: null,
        property_id: null,
        notes: null,
        created_at: '',
        updated_at: '',
      },
    ]

    const properties: RealEstateProperty[] = []

    const liabilities: Liability[] = [
      {
        id: 'liab-1',
        user_id: 'user-1',
        name: 'Dívida Financiamento',
        type: 'financing',
        total_amount: 25000,
        current_balance: 18000,
        monthly_payment: 1000,
        remaining_installments: 18,
        interest_rate_monthly: 0.015,
        due_date: null,
        notes: null,
        created_at: '',
        updated_at: '',
      },
    ]

    const summary = calculatePatrimonySummary({
      accounts,
      accountBalances: { 'acc-1': 5000 },
      investments,
      assets,
      properties,
      liabilities,
      creditCardDebt: 1200,
    })

    // Ativos: 5000 (caixa) + 16200 (investimentos) + 42000 (bens) = 63200
    expect(summary.totalAssets).toBe(63200)

    // Passivos: 18000 (liab) + 1200 (cartão) = 19200
    expect(summary.totalLiabilities).toBe(19200)

    // Patrimônio Líquido: 63200 - 19200 = 44000
    expect(summary.netWorth).toBe(44000)

    // Taxa de Endividamento: 19200 / 63200 = 30.37% -> 30%
    expect(summary.debtRatio).toBe(30)
  })

  it('garante neutralidade contábil no aporte em investimento (Regra 4)', () => {
    // Cenário: Usuário tem 10.000 em conta e transfere 3.000 para CDB
    let cashCents = toCents(10000)
    let investedCents = toCents(0)

    const aporteCents = toCents(3000)
    cashCents = subtractCents(cashCents, aporteCents)
    investedCents = sumCents(investedCents, aporteCents)

    // Patrimônio total de ativos permanece exatamente o mesmo
    const totalAssetsCents = sumCents(cashCents, investedCents)
    expect(fromCents(totalAssetsCents)).toBe(10000)
  })
})
