import { toCents, fromCents, sumCents, subtractCents, multiplyCents } from '@/lib/money'

export interface SimulationEvent {
  id: string
  name: string
  month: number // 1 a N
  type: 'income' | 'expense' | 'asset_purchase'
  amount: number
}

export interface SimulationParams {
  horizonMonths: number // ex: 6, 12, 24, 60
  initialCash: number
  initialInvestments: number
  monthlyIncomeBase: number
  monthlyExpenseBase: number
  incomeAdjustmentPercent: number // ex: +10% ou -20%
  expenseAdjustmentFixed: number // ex: -500 ou +1200
  annualInvestmentReturnRate: number // ex: 0.105 (10.5% a.a.)
  monthlyContribution: number
  events?: SimulationEvent[]
}

export interface SimulationMonthPoint {
  month: number
  label: string
  // Cenário Base (sem alterações)
  baseCash: number
  baseInvestments: number
  baseTotalNetWorth: number
  // Cenário Simulado
  simulatedCash: number
  simulatedInvestments: number
  simulatedTotalNetWorth: number
  // Diferencial
  netWorthDelta: number
}

export interface SimulationResult {
  timeline: SimulationMonthPoint[]
  finalBaseNetWorth: number
  finalSimulatedNetWorth: number
  netWorthGain: number
  monthlySavingsBase: number
  monthlySavingsSimulated: number
}

export function runSandboxSimulation(params: SimulationParams): SimulationResult {
  const {
    horizonMonths,
    initialCash,
    initialInvestments,
    monthlyIncomeBase,
    monthlyExpenseBase,
    incomeAdjustmentPercent,
    expenseAdjustmentFixed,
    annualInvestmentReturnRate,
    monthlyContribution,
    events = [],
  } = params

  const monthlyReturnRate = Math.pow(1 + annualInvestmentReturnRate, 1 / 12) - 1

  // Base
  let baseCashCents = toCents(initialCash)
  let baseInvCents = toCents(initialInvestments)

  // Simulado
  let simCashCents = toCents(initialCash)
  let simInvCents = toCents(initialInvestments)

  const simulatedIncome = monthlyIncomeBase * (1 + incomeAdjustmentPercent / 100)
  const simulatedExpense = Math.max(0, monthlyExpenseBase + expenseAdjustmentFixed)

  const baseMonthlyNetCents = subtractCents(toCents(monthlyIncomeBase), toCents(monthlyExpenseBase))
  const simMonthlyNetCents = subtractCents(toCents(simulatedIncome), toCents(simulatedExpense))

  const timeline: SimulationMonthPoint[] = []

  // Ponto Mês 0
  timeline.push({
    month: 0,
    label: 'Hoje',
    baseCash: fromCents(baseCashCents),
    baseInvestments: fromCents(baseInvCents),
    baseTotalNetWorth: fromCents(sumCents(baseCashCents, baseInvCents)),
    simulatedCash: fromCents(simCashCents),
    simulatedInvestments: fromCents(simInvCents),
    simulatedTotalNetWorth: fromCents(sumCents(simCashCents, simInvCents)),
    netWorthDelta: 0,
  })

  for (let m = 1; m <= horizonMonths; m++) {
    // 1. Evolução Cenário Base
    // Rendimento dos investimentos base
    const baseYieldCents = multiplyCents(baseInvCents, monthlyReturnRate)
    baseInvCents = sumCents(baseInvCents, baseYieldCents)

    // Caixa base recebe sobra ou absorve déficit
    baseCashCents = sumCents(baseCashCents, baseMonthlyNetCents)

    // 2. Evolução Cenário Simulado
    // Rendimento dos investimentos simulado
    const simYieldCents = multiplyCents(simInvCents, monthlyReturnRate)
    simInvCents = sumCents(simInvCents, simYieldCents)

    // Aporte programado (sai do caixa e vai para investimentos se houver caixa suficiente)
    const contribCents = toCents(monthlyContribution)
    if (contribCents > 0) {
      simInvCents = sumCents(simInvCents, contribCents)
      simCashCents = subtractCents(simCashCents, contribCents)
    }

    // Fluxo operacional simulado
    simCashCents = sumCents(simCashCents, simMonthlyNetCents)

    // 3. Eventos esporádicos no mês m
    const monthEvents = events.filter((e) => e.month === m)
    monthEvents.forEach((evt) => {
      const evtCents = toCents(evt.amount)
      if (evt.type === 'income') {
        simCashCents = sumCents(simCashCents, evtCents)
      } else if (evt.type === 'expense' || evt.type === 'asset_purchase') {
        simCashCents = subtractCents(simCashCents, evtCents)
      }
    })

    const baseTotalCents = sumCents(baseCashCents, baseInvCents)
    const simTotalCents = sumCents(simCashCents, simInvCents)

    timeline.push({
      month: m,
      label: m % 12 === 0 ? `${m / 12} ano${m / 12 > 1 ? 's' : ''}` : `Mês ${m}`,
      baseCash: fromCents(baseCashCents),
      baseInvestments: fromCents(baseInvCents),
      baseTotalNetWorth: fromCents(baseTotalCents),
      simulatedCash: fromCents(simCashCents),
      simulatedInvestments: fromCents(simInvCents),
      simulatedTotalNetWorth: fromCents(simTotalCents),
      netWorthDelta: fromCents(subtractCents(simTotalCents, baseTotalCents)),
    })
  }

  const lastPoint = timeline[timeline.length - 1]
  const finalBase = lastPoint.baseTotalNetWorth
  const finalSim = lastPoint.simulatedTotalNetWorth

  return {
    timeline,
    finalBaseNetWorth: finalBase,
    finalSimulatedNetWorth: finalSim,
    netWorthGain: fromCents(subtractCents(toCents(finalSim), toCents(finalBase))),
    monthlySavingsBase: fromCents(baseMonthlyNetCents),
    monthlySavingsSimulated: fromCents(simMonthlyNetCents),
  }
}

