/**
 * Motor Estratégico de Quitação de Dívidas e Financiamentos
 * 
 * Implementa as metodologias clássicas de finanças:
 * 1. Método Avalanche (Prioriza maior taxa de juros - Máxima economia de dinheiro)
 * 2. Método Bola de Neve / Snowball (Prioriza menor saldo - Vitórias psicológicas rápidas)
 * 3. Indicador DTI (Debt-to-Income Ratio)
 * 4. Simulador de Quitação Acelerada (Amortização Extra)
 */

export interface DebtItem {
  id: string
  name: string
  type: string
  currentBalance: number // Saldo devedor atual (R$)
  monthlyPayment: number // Parcela mensal (R$)
  monthlyInterestRate: number // % a.m.
  remainingInstallments?: number | null
}

export type DebtPayoffStrategy = 'avalanche' | 'snowball'

export interface DebtPortfolioMetrics {
  totalDebt: number
  totalMonthlyPayment: number
  weightedAverageInterestMonthly: number // % a.m.
  dtiPercent: number // Comprometimento da renda mensal (%)
  dtiStatus: 'healthy' | 'moderate' | 'critical'
  estimatedMonthsToDebtFree: number
  estimatedTotalInterestRemaining: number
}

export interface AcceleratedPayoffResult {
  originalMonths: number
  acceleratedMonths: number
  monthsSaved: number
  originalTotalInterest: number
  acceleratedTotalInterest: number
  interestSaved: number
}

/**
 * Calcula os indicadores consolidados da carteira de passivos
 */
export function calculateDebtPortfolioMetrics(
  debts: DebtItem[],
  monthlyIncome: number
): DebtPortfolioMetrics {
  const safeIncome = Math.max(1, monthlyIncome)
  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0)
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)

  // Taxa de juros média ponderada pelo saldo devedor
  let weightedInterestSum = 0
  for (const d of debts) {
    weightedInterestSum += d.currentBalance * (d.monthlyInterestRate || 0)
  }
  const weightedAverageInterestMonthly =
    totalDebt > 0 ? Number((weightedInterestSum / totalDebt).toFixed(2)) : 0

  // DTI = Parcelas / Renda
  const dtiPercent = Number(((totalMonthlyPayment / safeIncome) * 100).toFixed(1))

  let dtiStatus: 'healthy' | 'moderate' | 'critical' = 'healthy'
  if (dtiPercent > 35) {
    dtiStatus = 'critical'
  } else if (dtiPercent > 20) {
    dtiStatus = 'moderate'
  }

  // Prazo estimado até a quitação total
  const estimatedMonthsToDebtFree = debts.reduce((max, d) => {
    if (d.remainingInstallments && d.remainingInstallments > 0) {
      return Math.max(max, d.remainingInstallments)
    }
    if (d.monthlyPayment > 0) {
      return Math.max(max, Math.ceil(d.currentBalance / d.monthlyPayment))
    }
    return max
  }, 0)

  // Estimativa de juros totais restantes
  let estimatedTotalInterestRemaining = 0
  for (const d of debts) {
    const months = d.remainingInstallments || (d.monthlyPayment > 0 ? Math.ceil(d.currentBalance / d.monthlyPayment) : 1)
    const totalToPay = d.monthlyPayment > 0 ? d.monthlyPayment * months : d.currentBalance
    estimatedTotalInterestRemaining += Math.max(0, totalToPay - d.currentBalance)
  }

  return {
    totalDebt: Math.round(totalDebt * 100) / 100,
    totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
    weightedAverageInterestMonthly,
    dtiPercent,
    dtiStatus,
    estimatedMonthsToDebtFree,
    estimatedTotalInterestRemaining: Math.round(estimatedTotalInterestRemaining * 100) / 100,
  }
}

/**
 * Ordena os contratos de dívida pela estratégia escolhida
 */
export function sortDebtsByStrategy(
  debts: DebtItem[],
  strategy: DebtPayoffStrategy
): DebtItem[] {
  const list = [...debts]

  if (strategy === 'avalanche') {
    // Maior taxa de juros primeiro. Se igual, menor saldo.
    return list.sort((a, b) => {
      const diffRate = (b.monthlyInterestRate || 0) - (a.monthlyInterestRate || 0)
      if (Math.abs(diffRate) > 0.001) return diffRate
      return a.currentBalance - b.currentBalance
    })
  }

  // Bola de Neve (Snowball): Menor saldo devedor primeiro para vitórias rápidas
  return list.sort((a, b) => a.currentBalance - b.currentBalance)
}

/**
 * Simula a aceleração de quitação através de aportes extras mensais ou pontuais
 */
export function simulateAcceleratedDebtPayoff(params: {
  debts: DebtItem[]
  extraMonthlyPayment: number
  oneTimeExtraPayment?: number
  strategy?: DebtPayoffStrategy
}): AcceleratedPayoffResult {
  const {
    debts,
    extraMonthlyPayment,
    oneTimeExtraPayment = 0,
    strategy = 'avalanche',
  } = params

  if (debts.length === 0) {
    return {
      originalMonths: 0,
      acceleratedMonths: 0,
      monthsSaved: 0,
      originalTotalInterest: 0,
      acceleratedTotalInterest: 0,
      interestSaved: 0,
    }
  }

  // 1. Simulação sem amortização extra (Original)
  let originalMonths = 0
  let originalTotalInterest = 0
  for (const d of debts) {
    const i = (d.monthlyInterestRate || 0) / 100
    const pmt = d.monthlyPayment
    let bal = d.currentBalance
    let months = 0

    if (pmt <= bal * i) {
      // Parcela não cobre nem os juros (inviável calcular limite sem aumento de parcela)
      months = 120
      originalTotalInterest += bal * 0.5
    } else {
      while (bal > 0.5 && months < 360) {
        const interest = bal * i
        originalTotalInterest += interest
        const principal = pmt - interest
        bal = Math.max(0, bal - principal)
        months++
      }
    }
    originalMonths = Math.max(originalMonths, months)
  }

  // 2. Simulação com amortização acelerada
  const sorted = sortDebtsByStrategy(debts, strategy).map((d) => ({
    ...d,
    balance: d.currentBalance,
    monthlyRate: (d.monthlyInterestRate || 0) / 100,
  }))

  // Aplica o aporte pontual na primeira dívida da estratégia
  let oneTimeRemaining = oneTimeExtraPayment
  for (const item of sorted) {
    if (oneTimeRemaining <= 0) break
    const abated = Math.min(item.balance, oneTimeRemaining)
    item.balance -= abated
    oneTimeRemaining -= abated
  }

  let acceleratedMonths = 0
  let acceleratedTotalInterest = 0
  let totalActiveDebts = sorted.filter((d) => d.balance > 0).length

  while (totalActiveDebts > 0 && acceleratedMonths < 360) {
    acceleratedMonths++
    let extraPool = extraMonthlyPayment

    // Primeiro aplica as parcelas normais de cada dívida
    for (const item of sorted) {
      if (item.balance <= 0) continue

      const interest = item.balance * item.monthlyRate
      acceleratedTotalInterest += interest
      const normalPrincipal = Math.max(0, item.monthlyPayment - interest)
      item.balance = Math.max(0, item.balance - normalPrincipal)

      if (item.balance <= 0) {
        // Bola de neve: a parcela da dívida quitada soma ao bolo de extra!
        extraPool += item.monthlyPayment
      }
    }

    // Depois direciona todo o extraPool para a dívida prioritária ainda ativa
    for (const item of sorted) {
      if (item.balance <= 0 || extraPool <= 0) continue
      const abated = Math.min(item.balance, extraPool)
      item.balance -= abated
      extraPool -= abated
    }

    totalActiveDebts = sorted.filter((d) => d.balance > 0).length
  }

  const monthsSaved = Math.max(0, originalMonths - acceleratedMonths)
  const interestSaved = Math.max(0, Math.round(originalTotalInterest - acceleratedTotalInterest))

  return {
    originalMonths,
    acceleratedMonths,
    monthsSaved,
    originalTotalInterest: Math.round(originalTotalInterest),
    acceleratedTotalInterest: Math.round(acceleratedTotalInterest),
    interestSaved,
  }
}
