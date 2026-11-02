import { toCents, fromCents } from './money'

export interface MortgageScheduleMonth {
  month: number
  installment: number
  amortization: number
  interest: number
  remainingBalance: number
}

export interface MortgageSummary {
  system: 'sac' | 'price'
  financedAmount: number
  annualRate: number
  monthlyRate: number
  totalMonths: number
  initialInstallment: number
  finalInstallment: number
  totalInterestPaid: number
  totalAmountPaid: number
  schedule: MortgageScheduleMonth[]
}

export interface ExtraAmortizationResult {
  reductionType: 'term' | 'installment'
  extraAmount: number
  oldBalance: number
  newBalance: number
  oldMonthsRemaining: number
  newMonthsRemaining: number
  monthsSaved: number
  oldTotalInterest: number
  newTotalInterest: number
  interestSaved: number
  oldInstallment: number
  newInstallment: number
}

/**
 * Calcula taxa de juros nominal mensal padrão dos bancos brasileiros.
 * Exemplo: 9.5% a.a. -> 0.095 / 12 = 0.007916... a.m.
 */
export function getMonthlyInterestRate(annualRate: number): number {
  return annualRate / 12
}

/**
 * Calcula o cronograma completo pelo Sistema de Amortização Constante (SAC).
 */
export function calculateSac(
  financedAmount: number,
  annualRate: number,
  totalMonths: number
): MortgageSummary {
  if (totalMonths <= 0 || financedAmount <= 0) {
    return {
      system: 'sac',
      financedAmount,
      annualRate,
      monthlyRate: 0,
      totalMonths,
      initialInstallment: 0,
      finalInstallment: 0,
      totalInterestPaid: 0,
      totalAmountPaid: financedAmount,
      schedule: [],
    }
  }

  const monthlyRate = getMonthlyInterestRate(annualRate)
  const principalCents = toCents(financedAmount)
  const amortizationCents = Math.round(principalCents / totalMonths)

  let balanceCents = principalCents
  let totalInterestCents = 0
  const schedule: MortgageScheduleMonth[] = []

  for (let m = 1; m <= totalMonths; m++) {
    // Juros sobre o saldo devedor atual
    const interestCents = Math.round(balanceCents * monthlyRate)
    // No último mês, ajusta a amortização para zerar o saldo exatamente
    const actualAmortizationCents = m === totalMonths ? balanceCents : amortizationCents
    const installmentCents = actualAmortizationCents + interestCents

    balanceCents = Math.max(0, balanceCents - actualAmortizationCents)
    totalInterestCents += interestCents

    schedule.push({
      month: m,
      installment: fromCents(installmentCents),
      amortization: fromCents(actualAmortizationCents),
      interest: fromCents(interestCents),
      remainingBalance: fromCents(balanceCents),
    })
  }

  const initialInstallment = schedule[0]?.installment || 0
  const finalInstallment = schedule[schedule.length - 1]?.installment || 0

  return {
    system: 'sac',
    financedAmount,
    annualRate,
    monthlyRate,
    totalMonths,
    initialInstallment,
    finalInstallment,
    totalInterestPaid: fromCents(totalInterestCents),
    totalAmountPaid: fromCents(principalCents + totalInterestCents),
    schedule,
  }
}

/**
 * Calcula o cronograma completo pela Tabela Price (Sistema Francês).
 */
export function calculatePrice(
  financedAmount: number,
  annualRate: number,
  totalMonths: number
): MortgageSummary {
  if (totalMonths <= 0 || financedAmount <= 0) {
    return {
      system: 'price',
      financedAmount,
      annualRate,
      monthlyRate: 0,
      totalMonths,
      initialInstallment: 0,
      finalInstallment: 0,
      totalInterestPaid: 0,
      totalAmountPaid: financedAmount,
      schedule: [],
    }
  }

  const monthlyRate = getMonthlyInterestRate(annualRate)
  const principalCents = toCents(financedAmount)

  // Fórmula Price: P = SD * (i * (1+i)^n) / ((1+i)^n - 1)
  const factor = Math.pow(1 + monthlyRate, totalMonths)
  const installmentFloat = financedAmount * ((monthlyRate * factor) / (factor - 1))
  const fixedInstallmentCents = Math.round(toCents(installmentFloat))

  let balanceCents = principalCents
  let totalInterestCents = 0
  const schedule: MortgageScheduleMonth[] = []

  for (let m = 1; m <= totalMonths; m++) {
    const interestCents = Math.round(balanceCents * monthlyRate)
    let actualAmortizationCents = fixedInstallmentCents - interestCents

    if (m === totalMonths || actualAmortizationCents > balanceCents) {
      actualAmortizationCents = balanceCents
    }

    const installmentCents = actualAmortizationCents + interestCents
    balanceCents = Math.max(0, balanceCents - actualAmortizationCents)
    totalInterestCents += interestCents

    schedule.push({
      month: m,
      installment: fromCents(installmentCents),
      amortization: fromCents(actualAmortizationCents),
      interest: fromCents(interestCents),
      remainingBalance: fromCents(balanceCents),
    })
  }

  return {
    system: 'price',
    financedAmount,
    annualRate,
    monthlyRate,
    totalMonths,
    initialInstallment: fromCents(fixedInstallmentCents),
    finalInstallment: fromCents(fixedInstallmentCents),
    totalInterestPaid: fromCents(totalInterestCents),
    totalAmountPaid: fromCents(principalCents + totalInterestCents),
    schedule,
  }
}

/**
 * Simula o impacto de uma amortização extraordinária (Prazo vs. Parcela).
 * Compara matematicamente os juros e parcelas antes e depois do aporte.
 */
export function simulateAmortization(
  currentBalance: number,
  annualRate: number,
  remainingMonths: number,
  extraAmount: number,
  reductionType: 'term' | 'installment',
  system: 'sac' | 'price' = 'sac'
): ExtraAmortizationResult {
  const currentBalanceCents = toCents(currentBalance)
  const extraAmountCents = toCents(extraAmount)
  const newBalanceCents = Math.max(0, currentBalanceCents - extraAmountCents)
  const newBalance = fromCents(newBalanceCents)

  // 1. Simulação no cenário base (sem amortização)
  const baseSim =
    system === 'sac'
      ? calculateSac(currentBalance, annualRate, remainingMonths)
      : calculatePrice(currentBalance, annualRate, remainingMonths)

  const oldTotalInterest = baseSim.totalInterestPaid
  const oldInstallment = baseSim.initialInstallment

  // 2. Simulação com o aporte extraordinário
  if (newBalanceCents <= 0) {
    // Quitação total!
    return {
      reductionType,
      extraAmount,
      oldBalance: currentBalance,
      newBalance: 0,
      oldMonthsRemaining: remainingMonths,
      newMonthsRemaining: 0,
      monthsSaved: remainingMonths,
      oldTotalInterest,
      newTotalInterest: 0,
      interestSaved: oldTotalInterest,
      oldInstallment,
      newInstallment: 0,
    }
  }

  if (reductionType === 'term') {
    // Reduz prazo mantendo a amortização base mensal
    if (system === 'sac') {
      const originalMonthlyAmortizationCents = Math.round(currentBalanceCents / remainingMonths)
      const newMonthsRemaining = Math.max(
        1,
        Math.ceil(newBalanceCents / originalMonthlyAmortizationCents)
      )
      const newSim = calculateSac(newBalance, annualRate, newMonthsRemaining)

      return {
        reductionType: 'term',
        extraAmount,
        oldBalance: currentBalance,
        newBalance,
        oldMonthsRemaining: remainingMonths,
        newMonthsRemaining,
        monthsSaved: Math.max(0, remainingMonths - newMonthsRemaining),
        oldTotalInterest,
        newTotalInterest: newSim.totalInterestPaid,
        interestSaved: Math.max(0, oldTotalInterest - newSim.totalInterestPaid),
        oldInstallment,
        newInstallment: newSim.initialInstallment,
      }
    } else {
      // Price com redução de prazo: recalcula prazo mantendo a mesma parcela
      const monthlyRate = getMonthlyInterestRate(annualRate)
      const pmt = oldInstallment
      // n = - ln(1 - (SD * i) / PMT) / ln(1 + i)
      const numerator = 1 - (newBalance * monthlyRate) / pmt
      let newMonthsRemaining = remainingMonths

      if (numerator > 0) {
        newMonthsRemaining = Math.max(
          1,
          Math.ceil(-Math.log(numerator) / Math.log(1 + monthlyRate))
        )
      }

      const newSim = calculatePrice(newBalance, annualRate, newMonthsRemaining)

      return {
        reductionType: 'term',
        extraAmount,
        oldBalance: currentBalance,
        newBalance,
        oldMonthsRemaining: remainingMonths,
        newMonthsRemaining,
        monthsSaved: Math.max(0, remainingMonths - newMonthsRemaining),
        oldTotalInterest,
        newTotalInterest: newSim.totalInterestPaid,
        interestSaved: Math.max(0, oldTotalInterest - newSim.totalInterestPaid),
        oldInstallment,
        newInstallment: newSim.initialInstallment,
      }
    }
  } else {
    // Reduz o valor da parcela mantendo o mesmo prazo restante
    const newSim =
      system === 'sac'
        ? calculateSac(newBalance, annualRate, remainingMonths)
        : calculatePrice(newBalance, annualRate, remainingMonths)

    return {
      reductionType: 'installment',
      extraAmount,
      oldBalance: currentBalance,
      newBalance,
      oldMonthsRemaining: remainingMonths,
      newMonthsRemaining: remainingMonths,
      monthsSaved: 0,
      oldTotalInterest,
      newTotalInterest: newSim.totalInterestPaid,
      interestSaved: Math.max(0, oldTotalInterest - newSim.totalInterestPaid),
      oldInstallment,
      newInstallment: newSim.initialInstallment,
    }
  }
}
