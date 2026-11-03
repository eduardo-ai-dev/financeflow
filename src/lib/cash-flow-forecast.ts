import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'
import type { TransactionWithDetails } from '@/services/transactions'
import type { InvoiceWithTotals } from '@/services/invoices'
import { addDays, parseISO, format } from 'date-fns'

export interface ForecastDayPoint {
  date: string // YYYY-MM-DD
  displayDate: string // DD/MM
  dayOfWeek: string // Seg, Ter...
  balance: number // Saldo acumulado projetado ao final do dia
  income: number // Entradas no dia
  expenses: number // Saídas no dia
  isLowestPoint: boolean
  isDeficit: boolean
  events: Array<{
    id: string
    title: string
    amount: number
    kind: 'income' | 'expense' | 'invoice'
  }>
}

export interface UpcomingFlowItem {
  id: string
  title: string
  date: string
  amount: number
  kind: 'income' | 'expense' | 'invoice'
  status?: string
}

export interface CashFlowForecastSummary {
  startingBalance: number
  projectedFinalBalance: number
  netChange: number
  totalProjectedIncome: number
  totalProjectedExpenses: number
  lowestBalance: number
  lowestBalanceDate: string
  hasRiskOfDeficit: boolean
  status: 'healthy' | 'caution' | 'critical'
  statusMessage: string
  topUpcomingOutflows: UpcomingFlowItem[]
  topUpcomingInflows: UpcomingFlowItem[]
  timeline: ForecastDayPoint[]
}

export interface CalculateCashFlowForecastParams {
  startingBalance: number
  transactions: TransactionWithDetails[]
  invoices?: InvoiceWithTotals[]
  horizonDays: 30 | 60
  todayStr: string // YYYY-MM-DD
}

/**
 * Calcula a projeção diária de fluxo de caixa e curva de liquidez para os próximos 30 ou 60 dias.
 */
export function calculateCashFlowForecast(
  params: CalculateCashFlowForecastParams
): CashFlowForecastSummary {
  const {
    startingBalance,
    transactions,
    invoices = [],
    horizonDays,
    todayStr,
  } = params

  const todayDate = parseISO(todayStr)
  const endDate = addDays(todayDate, horizonDays)
  const endDateStr = format(endDate, 'yyyy-MM-dd')

  // Mapeia eventos por dia no período [todayStr, endDateStr]
  const dayEventsMap = new Map<
    string,
    Array<{
      id: string
      title: string
      amount: number
      kind: 'income' | 'expense' | 'invoice'
    }>
  >()

  // 1. Processa transações pendentes ou agendadas no horizonte
  for (const tx of transactions) {
    if (tx.status === 'canceled') continue

    const txDate = tx.due_date
    // Apenas transações a partir de hoje até o fim do horizonte
    if (txDate >= todayStr && txDate <= endDateStr) {
      if (tx.status === 'pending') {
        const list = dayEventsMap.get(txDate) || []
        list.push({
          id: tx.id,
          title: tx.description,
          amount: Number(tx.amount),
          kind: tx.kind === 'income' ? 'income' : 'expense',
        })
        dayEventsMap.set(txDate, list)
      }
    }
  }

  // 2. Processa faturas de cartão de crédito no horizonte
  for (const inv of invoices) {
    if (inv.total_amount <= 0) continue
    const invDate = inv.due_date

    if (invDate >= todayStr && invDate <= endDateStr) {
      // Se a fatura ainda estiver aberta ou fechada sem quitação total
      const list = dayEventsMap.get(invDate) || []
      list.push({
        id: `inv-${inv.id}`,
        title: `Fatura ${inv.card?.name || 'Cartão de Crédito'}`,
        amount: Number(inv.total_amount),
        kind: 'invoice',
      })
      dayEventsMap.set(invDate, list)
    }
  }

  // 3. Monta a linha do tempo diária acumulando os saldos
  let runningBalanceCents = toCents(startingBalance)
  let lowestBalanceCents = runningBalanceCents
  let lowestBalanceDate = todayStr
  let totalIncomeCents = 0
  let totalExpensesCents = 0

  const allOutflows: UpcomingFlowItem[] = []
  const allInflows: UpcomingFlowItem[] = []

  const rawPoints: Array<{
    date: string
    displayDate: string
    dayOfWeek: string
    balanceCents: number
    incomeCents: number
    expenseCents: number
    events: ForecastDayPoint['events']
  }> = []

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  for (let i = 0; i <= horizonDays; i++) {
    const d = addDays(todayDate, i)
    const dStr = format(d, 'yyyy-MM-dd')
    const displayDate = format(d, 'dd/MM')
    const dayOfWeek = WEEK_DAYS[d.getDay()]

    const dayEvents = dayEventsMap.get(dStr) || []
    let dayIncomeCents = 0
    let dayExpenseCents = 0

    for (const ev of dayEvents) {
      const evCents = toCents(ev.amount)
      if (ev.kind === 'income') {
        dayIncomeCents = sumCents(dayIncomeCents, evCents)
        totalIncomeCents = sumCents(totalIncomeCents, evCents)
        allInflows.push({
          id: ev.id,
          title: ev.title,
          date: dStr,
          amount: ev.amount,
          kind: 'income',
        })
      } else {
        dayExpenseCents = sumCents(dayExpenseCents, evCents)
        totalExpensesCents = sumCents(totalExpensesCents, evCents)
        allOutflows.push({
          id: ev.id,
          title: ev.title,
          date: dStr,
          amount: ev.amount,
          kind: ev.kind,
        })
      }
    }

    runningBalanceCents = sumCents(runningBalanceCents, dayIncomeCents)
    runningBalanceCents = subtractCents(runningBalanceCents, dayExpenseCents)

    if (runningBalanceCents < lowestBalanceCents) {
      lowestBalanceCents = runningBalanceCents
      lowestBalanceDate = dStr
    }

    rawPoints.push({
      date: dStr,
      displayDate,
      dayOfWeek,
      balanceCents: runningBalanceCents,
      incomeCents: dayIncomeCents,
      expenseCents: dayExpenseCents,
      events: dayEvents,
    })
  }

  // 4. Marca o ponto mais baixo da curva
  const timeline: ForecastDayPoint[] = rawPoints.map((pt) => ({
    date: pt.date,
    displayDate: pt.displayDate,
    dayOfWeek: pt.dayOfWeek,
    balance: fromCents(pt.balanceCents),
    income: fromCents(pt.incomeCents),
    expenses: fromCents(pt.expenseCents),
    isLowestPoint: pt.date === lowestBalanceDate,
    isDeficit: pt.balanceCents < 0,
    events: pt.events,
  }))

  const projectedFinalBalance = fromCents(runningBalanceCents)
  const lowestBalance = fromCents(lowestBalanceCents)
  const totalProjectedIncome = fromCents(totalIncomeCents)
  const totalProjectedExpenses = fromCents(totalExpensesCents)
  const netChange = fromCents(
    subtractCents(runningBalanceCents, toCents(startingBalance))
  )
  const hasRiskOfDeficit = lowestBalance < 0

  // 5. Diagnóstico de Status
  let status: 'healthy' | 'caution' | 'critical' = 'healthy'
  let statusMessage = 'Sua liquidez projetada permanecerá confortável e positiva durante todo o período.'

  if (hasRiskOfDeficit) {
    status = 'critical'
    statusMessage = `Risco de caixa negativo no dia ${format(parseISO(lowestBalanceDate), 'dd/MM')}: saldo mínimo previsto de R$ ${lowestBalance.toFixed(2)}.`
  } else if (lowestBalance < startingBalance * 0.2 || lowestBalance < 500) {
    status = 'caution'
    statusMessage = `Atenção: Margem de liquidez reduzida em ${format(parseISO(lowestBalanceDate), 'dd/MM')}, atingindo mínima de R$ ${lowestBalance.toFixed(2)}.`
  }

  // Ordena os maiores desembolsos e recebimentos
  allOutflows.sort((a, b) => b.amount - a.amount)
  allInflows.sort((a, b) => b.amount - a.amount)

  return {
    startingBalance,
    projectedFinalBalance,
    netChange,
    totalProjectedIncome,
    totalProjectedExpenses,
    lowestBalance,
    lowestBalanceDate,
    hasRiskOfDeficit,
    status,
    statusMessage,
    topUpcomingOutflows: allOutflows.slice(0, 4),
    topUpcomingInflows: allInflows.slice(0, 4),
    timeline,
  }
}

