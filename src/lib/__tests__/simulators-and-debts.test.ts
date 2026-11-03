import { describe, it, expect } from 'vitest'
import {
  calculatePurchaseDecision,
  type PurchaseDecisionParams,
} from '@/lib/purchase-decision'
import {
  calculateDebtPortfolioMetrics,
  sortDebtsByStrategy,
  simulateAcceleratedDebtPayoff,
  type DebtItem,
} from '@/lib/debt-strategies'

describe('Motor de Decisão de Compra (Purchase Decision Sandbox)', () => {
  const baseParams: PurchaseDecisionParams = {
    purchaseName: 'MacBook Pro M3 Max',
    purchasePrice: 15000,
    paymentMethod: 'cash',
    cashDiscountPercent: 10,
    monthlyIncome: 12000,
    monthlyFixedCosts: 5000,
    liquidReserves: 40000,
    annualBenchmarkRate: 11.5,
  }

  it('calcula desconto e impacto na reserva ao comprar à vista com margem segura', () => {
    const res = calculatePurchaseDecision(baseParams)

    expect(res.immediateSavings).toBe(1500) // 10% de 15000
    expect(res.finalPrice).toBe(13500)
    expect(res.remainingReserves).toBe(26500) // 40000 - 13500
    // Cobertura antes: 40000 / 5000 = 8 meses. Depois: 26500 / 5000 = 5.3 meses.
    expect(res.reservesCoverageBeforeMonths).toBe(8)
    expect(res.reservesCoverageAfterMonths).toBe(5.3)
    expect(res.verdict.level).toBe('warning') // entre 3 e 6 meses
  })

  it('emite alerta de alto risco (danger) se compra à vista consumir a reserva crítica (< 3 meses)', () => {
    const res = calculatePurchaseDecision({
      ...baseParams,
      liquidReserves: 18000, // Sobraria 4.500 (menos de 1 mês de custo fixo)
    })

    expect(res.verdict.level).toBe('danger')
    expect(res.reservesCoverageAfterMonths).toBeLessThan(3)
  })

  it('calcula impacto no fluxo de caixa para compra parcelada sem juros', () => {
    const res = calculatePurchaseDecision({
      ...baseParams,
      paymentMethod: 'installments',
      installmentsCount: 10,
      installmentsWithInterest: false,
    })

    expect(res.monthlyPayment).toBe(1500)
    expect(res.totalInterestPaid).toBe(0)
    // Comprometimento: 1500 / 12000 = 12.5%
    expect(res.monthlyIncomeCommitmentPercent).toBe(12.5)
    // Sobra antes: 7000. Sobra depois: 7000 - 1500 = 5500.
    expect(res.projectedMonthlySurplus).toBe(5500)
    expect(res.verdict.level).toBe('warning') // compromete > 12%
  })

  it('emite alerta crítico se a parcela gerar déficit mensal no orçamento', () => {
    const res = calculatePurchaseDecision({
      ...baseParams,
      monthlyIncome: 6000,
      monthlyFixedCosts: 5500, // sobra livre de apenas 500
      paymentMethod: 'installments',
      installmentsCount: 10, // parcela de 1500 > sobra de 500
    })

    expect(res.projectedMonthlySurplus).toBe(-1000)
    expect(res.verdict.level).toBe('danger')
    expect(res.verdict.title).toContain('Déficit')
  })
})

describe('Estratégias de Quitação de Dívidas e Financiamentos', () => {
  const sampleDebts: DebtItem[] = [
    {
      id: 'd-1',
      name: 'Cartão de Crédito Parcelado',
      type: 'credit_card',
      currentBalance: 3000,
      monthlyPayment: 600,
      monthlyInterestRate: 4.5, // Maior taxa
      remainingInstallments: 6,
    },
    {
      id: 'd-2',
      name: 'Empréstimo Pessoal Bancário',
      type: 'loan',
      currentBalance: 12000,
      monthlyPayment: 850,
      monthlyInterestRate: 2.2,
      remainingInstallments: 18,
    },
    {
      id: 'd-3',
      name: 'Financiamento de Veículo',
      type: 'financing',
      currentBalance: 25000,
      monthlyPayment: 980,
      monthlyInterestRate: 1.4,
      remainingInstallments: 32,
    },
  ]

  it('calcula métricas consolidadas e o indicador DTI corretamente', () => {
    const metrics = calculateDebtPortfolioMetrics(sampleDebts, 10000)

    expect(metrics.totalDebt).toBe(40000)
    expect(metrics.totalMonthlyPayment).toBe(2430)
    // DTI: 2430 / 10000 = 24.3%
    expect(metrics.dtiPercent).toBe(24.3)
    expect(metrics.dtiStatus).toBe('moderate')
    expect(metrics.estimatedMonthsToDebtFree).toBe(32)
  })

  it('ordena por método Avalanche (maior taxa de juros primeiro)', () => {
    const sorted = sortDebtsByStrategy(sampleDebts, 'avalanche')
    expect(sorted[0].id).toBe('d-1') // 4.5% a.m.
    expect(sorted[1].id).toBe('d-2') // 2.2% a.m.
    expect(sorted[2].id).toBe('d-3') // 1.4% a.m.
  })

  it('ordena por método Bola de Neve (menor saldo devedor primeiro)', () => {
    const sorted = sortDebtsByStrategy(sampleDebts, 'snowball')
    expect(sorted[0].id).toBe('d-1') // 3.000
    expect(sorted[1].id).toBe('d-2') // 12.000
    expect(sorted[2].id).toBe('d-3') // 25.000
  })

  it('simula economia de juros e redução de prazo com amortização acelerada', () => {
    const result = simulateAcceleratedDebtPayoff({
      debts: sampleDebts,
      extraMonthlyPayment: 500, // Aporte extra mensal de 500
      strategy: 'avalanche',
    })

    expect(result.acceleratedMonths).toBeLessThan(result.originalMonths)
    expect(result.monthsSaved).toBeGreaterThan(0)
    expect(result.interestSaved).toBeGreaterThan(0)
  })
})

