import { describe, it, expect } from 'vitest'
import {
  calculateCashFlowForecast,
  type CalculateCashFlowForecastParams,
} from '@/lib/cash-flow-forecast'
import type { TransactionWithDetails } from '@/services/transactions'
import type { InvoiceWithTotals } from '@/services/invoices'

describe('Motor Preditivo de Fluxo de Caixa (30/60 Dias)', () => {
  const TODAY = '2026-11-03'

  const mockTransactions: TransactionWithDetails[] = [
    {
      id: 'tx-1',
      user_id: 'user-1',
      kind: 'income',
      description: 'Salário Mensal',
      amount: 10000,
      account_id: 'acc-1',
      to_account_id: null,
      category_id: null,
      status: 'pending',
      due_date: '2026-11-05',
      paid_date: null,
      notes: null,
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'tx-2',
      user_id: 'user-1',
      kind: 'expense',
      description: 'Aluguel do Apartamento',
      amount: 3500,
      account_id: 'acc-1',
      to_account_id: null,
      category_id: null,
      status: 'pending',
      due_date: '2026-11-10',
      paid_date: null,
      notes: null,
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'tx-3',
      user_id: 'user-1',
      kind: 'expense',
      description: 'Condomínio e Energia',
      amount: 1200,
      account_id: 'acc-1',
      to_account_id: null,
      category_id: null,
      status: 'pending',
      due_date: '2026-11-15',
      paid_date: null,
      notes: null,
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
  ]

  const mockInvoices: InvoiceWithTotals[] = [
    {
      id: 'inv-1',
      user_id: 'user-1',
      card_id: 'card-1',
      month: 11,
      year: 2026,
      closing_date: '2026-11-14',
      due_date: '2026-11-20',
      status: 'open',
      payment_transaction_id: null,
      total_amount: 2500,
      transactions_count: 5,
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
      card: {
        id: 'card-1',
        user_id: 'user-1',
        name: 'Cartão Platinum',
        closing_day: 14,
        due_day: 20,
        color: '#10b981',
        limit_amount: 15000,
        initial_used_amount: 0,
        institution: null,
        brand: 'mastercard',
        default_account_id: null,
        is_archived: false,
        created_at: '2026-11-01',
        updated_at: '2026-11-01',
      },
    },
  ]

  it('projeta a evolução do saldo e identifica a mínima liquidez em 30 dias', () => {
    const params: CalculateCashFlowForecastParams = {
      startingBalance: 5000,
      transactions: mockTransactions,
      invoices: mockInvoices,
      horizonDays: 30,
      todayStr: TODAY,
    }

    const forecast = calculateCashFlowForecast(params)

    expect(forecast.startingBalance).toBe(5000)
    expect(forecast.totalProjectedIncome).toBe(10000)
    // Despesas: 3500 + 1200 + 2500 (fatura) = 7200
    expect(forecast.totalProjectedExpenses).toBe(7200)
    // Saldo final: 5000 + 10000 - 7200 = 7800
    expect(forecast.projectedFinalBalance).toBe(7800)
    expect(forecast.netChange).toBe(2800)
    expect(forecast.hasRiskOfDeficit).toBe(false)
    expect(forecast.status).toBe('healthy')
  })

  it('detecta risco de déficit crítico quando saídas superam o saldo inicial antes da entrada', () => {
    const params: CalculateCashFlowForecastParams = {
      startingBalance: 1000, // Saldo inicial baixo
      transactions: [
        {
          id: 'tx-heavy',
          user_id: 'user-1',
          kind: 'expense',
          description: 'IPVA Parcela Única',
          amount: 3000, // 3000 > 1000
          account_id: 'acc-1',
          to_account_id: null,
          category_id: null,
          status: 'pending',
          due_date: '2026-11-04',
          paid_date: null,
          notes: null,
          created_at: '2026-11-01',
          updated_at: '2026-11-01',
        },
      ],
      horizonDays: 30,
      todayStr: TODAY,
    }

    const forecast = calculateCashFlowForecast(params)

    expect(forecast.hasRiskOfDeficit).toBe(true)
    expect(forecast.lowestBalance).toBe(-2000)
    expect(forecast.lowestBalanceDate).toBe('2026-11-04')
    expect(forecast.status).toBe('critical')
    expect(forecast.statusMessage).toContain('Risco de caixa negativo')
  })

  it('ordena os maiores desembolsos da janela preditiva', () => {
    const params: CalculateCashFlowForecastParams = {
      startingBalance: 10000,
      transactions: mockTransactions,
      invoices: mockInvoices,
      horizonDays: 60,
      todayStr: TODAY,
    }

    const forecast = calculateCashFlowForecast(params)
    expect(forecast.topUpcomingOutflows.length).toBeGreaterThan(0)
    // O maior desembolso deve ser o Aluguel de 3500
    expect(forecast.topUpcomingOutflows[0].title).toBe('Aluguel do Apartamento')
    expect(forecast.topUpcomingOutflows[0].amount).toBe(3500)
  })
})
