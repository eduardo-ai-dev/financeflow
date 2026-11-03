/**
 * Motor de Análise e Decisão de Compra (Purchase Decision Sandbox)
 * 
 * Avalia o impacto financeiro de uma nova aquisição sobre o fluxo de caixa,
 * liquidez da reserva de emergência e custo de oportunidade.
 */

export interface PurchaseDecisionParams {
  purchaseName: string
  purchasePrice: number // R$
  paymentMethod: 'cash' | 'installments' | 'loan'
  
  // Parâmetros para À Vista
  cashDiscountPercent?: number // ex: 5 (5%)

  // Parâmetros para Parcelado
  installmentsCount?: number // ex: 10
  installmentsWithInterest?: boolean
  installmentsMonthlyInterest?: number // % a.m.

  // Parâmetros para Financiamento / Empréstimo
  downPayment?: number // R$ entrada
  loanTermMonths?: number // meses
  loanMonthlyInterest?: number // % a.m.

  // Contexto financeiro do usuário (saldos reais)
  monthlyIncome: number // Renda mensal líquida (R$)
  monthlyFixedCosts: number // Custos essenciais mensais (R$)
  liquidReserves: number // Saldo disponível em contas e reservas (R$)
  annualBenchmarkRate?: number // Taxa anual de referência (ex: CDI 11.5%)
}

export type DecisionVerdictLevel = 'safe' | 'warning' | 'danger'

export interface DecisionVerdict {
  level: DecisionVerdictLevel
  title: string
  summary: string
  reasons: string[]
  tips: string[]
}

export interface PurchaseDecisionResult {
  // Preço e Condições
  finalPrice: number
  immediateSavings: number
  monthlyPayment: number
  totalPayments: number
  totalInterestPaid: number

  // Impacto na Reserva / Liquidez
  remainingReserves: number
  reservesCoverageBeforeMonths: number
  reservesCoverageAfterMonths: number

  // Impacto no Fluxo de Caixa
  monthlyIncomeCommitmentPercent: number
  currentMonthlySurplus: number
  projectedMonthlySurplus: number

  // Custo de Oportunidade
  opportunityCost12Months: number // Quanto renderia se ficasse investido por 12 meses
  bestOptionRecommendation: 'cash' | 'installments'

  // Veredito Financeiro
  verdict: DecisionVerdict
}

export function calculatePurchaseDecision(
  params: PurchaseDecisionParams
): PurchaseDecisionResult {
  const {
    purchasePrice,
    paymentMethod,
    cashDiscountPercent = 0,
    installmentsCount = 1,
    installmentsWithInterest = false,
    installmentsMonthlyInterest = 0,
    downPayment = 0,
    loanTermMonths = 12,
    loanMonthlyInterest = 1.99,
    monthlyIncome,
    monthlyFixedCosts,
    liquidReserves,
    annualBenchmarkRate = 11.5,
  } = params

  const safeIncome = Math.max(1, monthlyIncome)
  const safeFixedCosts = Math.max(1, monthlyFixedCosts)
  const currentMonthlySurplus = Math.max(0, monthlyIncome - monthlyFixedCosts)
  const reservesCoverageBeforeMonths = Number((liquidReserves / safeFixedCosts).toFixed(1))

  let finalPrice = purchasePrice
  let immediateSavings = 0
  let monthlyPayment = 0
  let totalPayments = 1
  let totalInterestPaid = 0
  let remainingReserves = liquidReserves

  // 1. Cálculos de acordo com a modalidade
  if (paymentMethod === 'cash') {
    const discountFactor = Math.min(100, Math.max(0, cashDiscountPercent)) / 100
    immediateSavings = purchasePrice * discountFactor
    finalPrice = purchasePrice - immediateSavings
    monthlyPayment = 0
    totalPayments = 1
    totalInterestPaid = 0
    remainingReserves = Math.max(0, liquidReserves - finalPrice)
  } else if (paymentMethod === 'installments') {
    const n = Math.max(1, Math.min(48, installmentsCount))
    totalPayments = n

    if (!installmentsWithInterest || installmentsMonthlyInterest <= 0) {
      monthlyPayment = purchasePrice / n
      finalPrice = purchasePrice
      totalInterestPaid = 0
    } else {
      const i = installmentsMonthlyInterest / 100
      // Tabela Price: PMT = PV * (i / (1 - (1+i)^-n))
      const factor = Math.pow(1 + i, n)
      monthlyPayment = (purchasePrice * (i * factor)) / (factor - 1)
      finalPrice = monthlyPayment * n
      totalInterestPaid = Math.max(0, finalPrice - purchasePrice)
    }
  } else {
    // Financiamento / CDC
    const pv = Math.max(0, purchasePrice - downPayment)
    const n = Math.max(1, Math.min(120, loanTermMonths))
    totalPayments = n
    const i = Math.max(0.001, loanMonthlyInterest / 100)

    const factor = Math.pow(1 + i, n)
    monthlyPayment = (pv * (i * factor)) / (factor - 1)
    const financedTotal = monthlyPayment * n
    finalPrice = downPayment + financedTotal
    totalInterestPaid = Math.max(0, financedTotal - pv)
    remainingReserves = Math.max(0, liquidReserves - downPayment)
  }

  // 2. Impactos na reserva e no fluxo de caixa
  const reservesCoverageAfterMonths = Number(
    (remainingReserves / safeFixedCosts).toFixed(1)
  )

  const monthlyIncomeCommitmentPercent = Number(
    ((monthlyPayment / safeIncome) * 100).toFixed(1)
  )

  const projectedMonthlySurplus = currentMonthlySurplus - monthlyPayment

  // 3. Custo de Oportunidade (Benchmark CDI)
  // Rendimento em 12 meses do valor da compra à vista se ficasse investido
  const monthlyBenchmarkRate = Math.pow(1 + annualBenchmarkRate / 100, 1 / 12) - 1
  const opportunityCost12Months = Math.round(
    purchasePrice * Math.pow(1 + monthlyBenchmarkRate, 12) - purchasePrice
  )

  // Comparação À Vista com Desconto vs Parcelado sem Juros
  // Se o desconto à vista for maior que o rendimento aproximado do dinheiro no período, à vista compensa
  const estimatedReturnDuringInstallments =
    (purchasePrice * (annualBenchmarkRate / 100) * (totalPayments / 12)) / 2
  const bestOptionRecommendation: 'cash' | 'installments' =
    immediateSavings >= estimatedReturnDuringInstallments ? 'cash' : 'installments'

  // 4. Motor de Diagnóstico & Veredito
  let level: DecisionVerdictLevel = 'safe'
  let title = 'Compra Aprovada com Segurança'
  let summary =
    'Esta aquisição está perfeitamente alinhada com a sua capacidade financeira e não coloca em risco sua tranquilidade.'
  const reasons: string[] = []
  const tips: string[] = []

  if (paymentMethod === 'cash') {
    if (reservesCoverageAfterMonths < 3) {
      level = 'danger'
      title = 'Alto Risco para a Reserva de Emergência'
      summary =
        'Comprar este item à vista consumirá sua proteção para imprevistos, deixando você com menos de 3 meses de cobertura.'
      reasons.push(
        `Sua reserva cairá de ${reservesCoverageBeforeMonths} para ${reservesCoverageAfterMonths} meses de custo de vida.`
      )
      tips.push(
        'Considere criar um Cofre para planejar essa compra mês a mês sem desfalcar sua reserva.',
        'Se o item for urgente, avalie parcelar para diluir o desembolso inicial.'
      )
    } else if (reservesCoverageAfterMonths < 6) {
      level = 'warning'
      title = 'Atenção: Reserva Ficará Limítrofe'
      summary =
        'A compra é viável, porém reduzirá sua reserva para um patamar que exige cautela nos próximos meses.'
      reasons.push(
        `Sua reserva passará a cobrir ${reservesCoverageAfterMonths} meses de custos essenciais (o ideal é 6 meses).`
      )
      tips.push(
        'Programe aportes adicionais nos próximos meses para recompor o saldo da reserva.',
        `Você economizou ${formatCurrency(immediateSavings)} negociando o pagamento à vista.`
      )
    } else {
      reasons.push(
        `Sua reserva permanecerá robusta com ${reservesCoverageAfterMonths} meses de cobertura após a compra.`
      )
      if (immediateSavings > 0) {
        reasons.push(
          `Você aproveitou um desconto real de ${formatCurrency(immediateSavings)}.`
        )
      }
      tips.push(
        'Excelente negociação à vista sem comprometer despesas futuras nem contrair dívidas.'
      )
    }
  } else {
    // Parcelado ou Financiado
    if (projectedMonthlySurplus < 0) {
      level = 'danger'
      title = 'Déficit no Fluxo de Caixa'
      summary =
        'A nova parcela mensal supera a sua sobra orçamentária, gerando déficit todo mês e risco de dívida bancária.'
      reasons.push(
        `A parcela de ${formatCurrency(monthlyPayment)} é maior do que sua sobra mensal atual de ${formatCurrency(currentMonthlySurplus)}.`
      )
      tips.push(
        'Aumente o número de parcelas para reduzir o valor mensal até caber no orçamento livre.',
        'Elimine despesas supérfluas antes de assumir este novo compromisso.'
      )
    } else if (monthlyIncomeCommitmentPercent > 25) {
      level = 'danger'
      title = 'Comprometimento Excessivo de Renda'
      summary =
        'Mais de 25% da sua renda mensal ficará presa a este único compromisso durante o período.'
      reasons.push(
        `Essa parcela consumirá ${monthlyIncomeCommitmentPercent}% de tudo o que você recebe por mês.`
      )
      tips.push(
        'Recomenda-se que nenhuma despesa parcelada individual exceda 10% a 15% da renda.',
        'Dê uma entrada maior para diminuir o valor das parcelas mensais.'
      )
    } else if (monthlyIncomeCommitmentPercent > 12 || projectedMonthlySurplus < 300) {
      level = 'warning'
      title = 'Viável, mas com Margem Orçamentária Apertada'
      summary =
        'A parcela cabe no bolso, mas reduzirá consideravelmente sua flexibilidade para outros planos ou imprevistos.'
      reasons.push(
        `Compromete ${monthlyIncomeCommitmentPercent}% da renda líquida por ${totalPayments} meses.`,
        `Sua sobra mensal passará de ${formatCurrency(currentMonthlySurplus)} para ${formatCurrency(projectedMonthlySurplus)}.`
      )
      tips.push(
        'Evite assumir outros parcelamentos até que parte dessas parcelas tenha sido quitada.',
        'Mantenha o saldo do dinheiro reservado em um cofre com liquidez diária.'
      )
    } else {
      reasons.push(
        `A parcela de ${formatCurrency(monthlyPayment)} compromete apenas ${monthlyIncomeCommitmentPercent}% da sua renda mensal.`,
        `Você ainda terá uma folga confortável de ${formatCurrency(projectedMonthlySurplus)} todo mês.`
      )
      tips.push(
        'Lembre-se de registrar o parcelamento para manter o limite e a fatura acompanhados automaticamente.'
      )
    }
  }

  return {
    finalPrice: Math.round(finalPrice * 100) / 100,
    immediateSavings: Math.round(immediateSavings * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayments,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    remainingReserves: Math.round(remainingReserves * 100) / 100,
    reservesCoverageBeforeMonths,
    reservesCoverageAfterMonths,
    monthlyIncomeCommitmentPercent,
    currentMonthlySurplus: Math.round(currentMonthlySurplus * 100) / 100,
    projectedMonthlySurplus: Math.round(projectedMonthlySurplus * 100) / 100,
    opportunityCost12Months,
    bestOptionRecommendation,
    verdict: {
      level,
      title,
      summary,
      reasons,
      tips,
    },
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}
