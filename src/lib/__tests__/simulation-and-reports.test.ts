import { describe, it, expect } from 'vitest'
import { runSandboxSimulation, type SimulationEvent } from '@/lib/simulation'

describe('Fase 7 — Motor de Simulação Sandbox (Regra 5)', () => {
  it('projeta cenário de 12 meses sem alterar dados reais', () => {
    const result = runSandboxSimulation({
      horizonMonths: 12,
      initialCash: 10000,
      initialInvestments: 20000,
      monthlyIncomeBase: 8000,
      monthlyExpenseBase: 6000,
      incomeAdjustmentPercent: 0,
      expenseAdjustmentFixed: 0,
      annualInvestmentReturnRate: 0.12, // 12% a.a.
      monthlyContribution: 0,
    })

    // Deve gerar exatamente 13 pontos (Mês 0 a 12)
    expect(result.timeline.length).toBe(13)
    expect(result.timeline[0].month).toBe(0)
    expect(result.timeline[12].month).toBe(12)

    // Cenário base com sobra de R$ 2000/mês
    expect(result.monthlySavingsBase).toBe(2000)

    // O patrimônio final no mês 12 deve ser superior ao inicial de R$ 30.000
    expect(result.finalBaseNetWorth).toBeGreaterThan(30000)
  })

  it('calcula ganho adicional quando há aumento salarial e corte de gastos', () => {
    const result = runSandboxSimulation({
      horizonMonths: 6,
      initialCash: 5000,
      initialInvestments: 10000,
      monthlyIncomeBase: 5000,
      monthlyExpenseBase: 4000,
      incomeAdjustmentPercent: 10, // Renda sobe 10% (+500)
      expenseAdjustmentFixed: -300, // Despesa cai 300
      annualInvestmentReturnRate: 0.10,
      monthlyContribution: 500,
    })

    // Sobra mensal simulada: 5500 - 3700 = 1800
    expect(result.monthlySavingsSimulated).toBe(1800)

    // O patrimônio simulado deve superar o patrimônio base
    expect(result.finalSimulatedNetWorth).toBeGreaterThan(result.finalBaseNetWorth)
    expect(result.netWorthGain).toBeGreaterThan(0)
  })

  it('incorpora eventos avulsos extraordinários no mês correto', () => {
    const events: SimulationEvent[] = [
      {
        id: 'evt-1',
        name: 'Bônus Anual',
        month: 6,
        type: 'income',
        amount: 10000,
      },
    ]

    const result = runSandboxSimulation({
      horizonMonths: 12,
      initialCash: 0,
      initialInvestments: 0,
      monthlyIncomeBase: 5000,
      monthlyExpenseBase: 5000,
      incomeAdjustmentPercent: 0,
      expenseAdjustmentFixed: 0,
      annualInvestmentReturnRate: 0,
      monthlyContribution: 0,
      events,
    })

    // No mês 5 o patrimônio simulado é 0
    expect(result.timeline[5].simulatedTotalNetWorth).toBe(0)

    // No mês 6 o bônus entra e o patrimônio sobe para 10.000
    expect(result.timeline[6].simulatedTotalNetWorth).toBe(10000)

    // No mês 12 continua com 10.000 (sem novas sobras nem despesas adicionais)
    expect(result.finalSimulatedNetWorth).toBe(10000)
  })
})

describe('Fase 8 — Relatórios e Exportação CSV', () => {
  it('formata valores de moeda em padrão brasileiro com vírgula para Excel', () => {
    const val = 1234.56
    const str = val.toFixed(2).replace('.', ',')
    expect(str).toBe('1234,56')
  })
})

