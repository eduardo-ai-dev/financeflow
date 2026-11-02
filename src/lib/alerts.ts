import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import type { TransactionWithDetails } from '@/services/transactions'
import type { CreditCardWithLimit } from '@/services/cards'
import type { InvoiceWithTotals } from '@/services/invoices'
import type { GoalWithStats } from '@/services/goals'

export type AlertSeverity = 'critical' | 'warning' | 'success' | 'info'
export type AlertCategory = 'bills' | 'cards' | 'goals'

export interface FinancialAlert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  description: string
  amount?: number
  date?: string
  actionPath: string
  actionLabel: string
}

export interface BuildAlertsInput {
  todayStr: string
  transactions: TransactionWithDetails[]
  cards: CreditCardWithLimit[]
  invoices?: InvoiceWithTotals[]
  goals: GoalWithStats[]
}

const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  success: 2,
  info: 3,
}

/**
 * Calcula a diferença inteira em dias entre duas datas ISO "AAAA-MM-DD" (target - base).
 */
export function diffDaysISO(baseISO: string, targetISO: string): number {
  const [by, bm, bd] = baseISO.split('-').map(Number)
  const [ty, tm, td] = targetISO.split('-').map(Number)
  const baseUTC = Date.UTC(by, bm - 1, bd)
  const targetUTC = Date.UTC(ty, tm - 1, td)
  return Math.round((targetUTC - baseUTC) / (1000 * 60 * 60 * 24))
}

/**
 * Calcula a próxima data de vencimento "AAAA-MM-DD" para um dia fixo do mês a partir de todayStr.
 */
export function getNextMonthlyDueDateISO(todayStr: string, dueDay: number): string {
  const [year, month, day] = todayStr.split('-').map(Number)
  const targetMonthOffset = day <= dueDay ? 0 : 1
  const rawDate = new Date(Date.UTC(year, month - 1 + targetMonthOffset, 1))
  const tYear = rawDate.getUTCFullYear()
  const tMonth = rawDate.getUTCMonth() + 1
  const lastDayOfTargetMonth = new Date(Date.UTC(tYear, tMonth, 0)).getUTCDate()
  const clampedDay = Math.min(Math.max(1, dueDay), lastDayOfTargetMonth)

  return `${tYear}-${String(tMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

export function buildFinancialAlerts({
  todayStr,
  transactions,
  cards,
  invoices = [],
  goals,
}: BuildAlertsInput): FinancialAlert[] {
  const alerts: FinancialAlert[] = []

  // 1. Contas a pagar e recebimentos (transações pendentes)
  for (const tx of transactions) {
    if (tx.status !== 'pending') continue
    if (tx.kind !== 'expense' && tx.kind !== 'income') continue

    const diff = diffDaysISO(todayStr, tx.due_date)

    if (tx.kind === 'expense') {
      if (diff < 0) {
        const daysLate = Math.abs(diff)
        alerts.push({
          id: `tx-overdue-${tx.id}`,
          severity: 'critical',
          category: 'bills',
          title: `Conta em atraso: ${tx.description}`,
          description: `Venceu em ${formatDate(tx.due_date)} (${
            daysLate === 1 ? 'há 1 dia' : `há ${daysLate} dias`
          }). Regularize para evitar encargos.`,
          amount: Number(tx.amount),
          date: tx.due_date,
          actionPath: '/saidas',
          actionLabel: 'Regularizar',
        })
      } else if (diff <= 7) {
        const labelPrefix =
          diff === 0
            ? 'Vence hoje'
            : diff === 1
            ? 'Vence amanhã'
            : 'Vencimento próximo'
        const suffix =
          diff === 0
            ? 'hoje'
            : diff === 1
            ? 'amanhã'
            : `em ${diff} dias (${formatDate(tx.due_date)})`

        alerts.push({
          id: `tx-upcoming-${tx.id}-${tx.due_date}`,
          severity: diff <= 1 ? 'critical' : 'warning',
          category: 'bills',
          title: `${labelPrefix}: ${tx.description}`,
          description: `Pagamento de ${formatBRL(tx.amount)} programado para ${suffix}.`,
          amount: Number(tx.amount),
          date: tx.due_date,
          actionPath: '/calendario',
          actionLabel: 'Ver Calendário',
        })
      }
    } else if (tx.kind === 'income') {
      if (diff < 0) {
        alerts.push({
          id: `inc-overdue-${tx.id}`,
          severity: 'warning',
          category: 'bills',
          title: `Recebimento pendente: ${tx.description}`,
          description: `Entrada prevista para ${formatDate(tx.due_date)} ainda não confirmada.`,
          amount: Number(tx.amount),
          date: tx.due_date,
          actionPath: '/entradas',
          actionLabel: 'Confirmar',
        })
      } else if (diff <= 5) {
        alerts.push({
          id: `inc-upcoming-${tx.id}-${tx.due_date}`,
          severity: 'info',
          category: 'bills',
          title:
            diff === 0
              ? `Recebimento previsto para hoje: ${tx.description}`
              : `Entrada próxima: ${tx.description}`,
          description: `Previsão de recebimento em ${formatDate(tx.due_date)}.`,
          amount: Number(tx.amount),
          date: tx.due_date,
          actionPath: '/entradas',
          actionLabel: 'Acompanhar',
        })
      }
    }
  }

  // 2. Faturas de Cartão e Limite de Crédito
  const cardsWithInvoiceAlert = new Set<string>()

  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.total_amount <= 0) continue
    const cardName = inv.card?.name || 'Cartão de Crédito'
    const diff = diffDaysISO(todayStr, inv.due_date)

    if (diff < 0) {
      cardsWithInvoiceAlert.add(inv.card_id)
      alerts.push({
        id: `inv-overdue-${inv.id}`,
        severity: 'critical',
        category: 'cards',
        title: `Fatura vencida: ${cardName}`,
        description: `Fatura de ${formatBRL(inv.total_amount)} venceu em ${formatDate(inv.due_date)}.`,
        amount: inv.total_amount,
        date: inv.due_date,
        actionPath: '/cartoes',
        actionLabel: 'Pagar Fatura',
      })
    } else if (diff <= 5) {
      cardsWithInvoiceAlert.add(inv.card_id)
      alerts.push({
        id: `inv-upcoming-${inv.id}`,
        severity: diff <= 1 ? 'critical' : 'warning',
        category: 'cards',
        title:
          diff === 0
            ? `Fatura vence hoje: ${cardName}`
            : `Fatura próxima: ${cardName}`,
        description: `Vencimento em ${formatDate(inv.due_date)} no valor de ${formatBRL(inv.total_amount)}.`,
        amount: inv.total_amount,
        date: inv.due_date,
        actionPath: '/cartoes',
        actionLabel: 'Ver Fatura',
      })
    }
  }

  for (const card of cards) {
    if (card.is_archived) continue

    // Caso o cartão tenha valor utilizado mas sem fatura individual disparada nos próximos 5 dias
    if (card.used_amount > 0 && !cardsWithInvoiceAlert.has(card.id)) {
      const nextDueISO = getNextMonthlyDueDateISO(todayStr, card.due_day)
      const diff = diffDaysISO(todayStr, nextDueISO)
      if (diff >= 0 && diff <= 5) {
        alerts.push({
          id: `card-due-${card.id}-${nextDueISO}`,
          severity: diff <= 1 ? 'critical' : 'warning',
          category: 'cards',
          title:
            diff === 0
              ? `Cartão ${card.name} vence hoje`
              : `Vencimento próximo: ${card.name}`,
          description: `Ciclo com vencimento em ${formatDate(nextDueISO)}. Confira o fechamento da fatura.`,
          amount: card.used_amount,
          date: nextDueISO,
          actionPath: '/cartoes',
          actionLabel: 'Abrir Cartões',
        })
      }
    }

    // Alerta de uso elevado de limite (>= 85%)
    if (card.limit_amount > 0) {
      const usagePct = Math.round((card.used_amount / card.limit_amount) * 100)
      if (usagePct >= 85) {
        alerts.push({
          id: `card-limit-${card.id}`,
          severity: usagePct >= 95 ? 'critical' : 'warning',
          category: 'cards',
          title: `Limite utilizado em ${usagePct}%: ${card.name}`,
          description: `Disponível atual de ${formatBRL(card.available_limit)} sobre ${formatBRL(card.limit_amount)}.`,
          amount: card.used_amount,
          actionPath: '/cartoes',
          actionLabel: 'Revisar Limite',
        })
      }
    }
  }

  // 3. Metas & Objetivos Financeiros
  for (const goal of goals) {
    if (goal.status === 'completed' || goal.status === 'canceled') continue

    if (goal.progress_percent >= 100 && goal.target_amount > 0) {
      alerts.push({
        id: `goal-100-${goal.id}`,
        severity: 'success',
        category: 'goals',
        title: `Meta atingida: ${goal.name}!`,
        description: `Você acumulou ${formatBRL(goal.current_amount)} (100% da meta). Pronta para realizar ou converter em patrimônio.`,
        amount: goal.current_amount,
        actionPath: '/metas',
        actionLabel: 'Realizar Meta',
      })
      continue
    }

    if (goal.status === 'in_progress' && goal.target_date) {
      const diff = diffDaysISO(todayStr, goal.target_date)
      if (diff < 0) {
        alerts.push({
          id: `goal-deadline-past-${goal.id}`,
          severity: 'warning',
          category: 'goals',
          title: `Prazo da meta vencido: ${goal.name}`,
          description: `A data alvo (${formatDate(goal.target_date)}) passou com ${goal.progress_percent}% concluído. Ajuste o prazo ou faça um novo aporte.`,
          amount: goal.remaining_amount,
          date: goal.target_date,
          actionPath: '/metas',
          actionLabel: 'Ajustar Meta',
        })
        continue
      } else if (diff <= 15) {
        alerts.push({
          id: `goal-deadline-soon-${goal.id}`,
          severity: 'warning',
          category: 'goals',
          title: `Reta final da meta: ${goal.name}`,
          description: `Data alvo em ${formatDate(goal.target_date)} (${diff === 0 ? 'hoje' : `em ${diff} dias`}). Faltam ${formatBRL(goal.remaining_amount)}.`,
          amount: goal.remaining_amount,
          date: goal.target_date,
          actionPath: '/metas',
          actionLabel: 'Aportar',
        })
        continue
      }
    }

    if (goal.status === 'in_progress' && goal.progress_percent >= 80) {
      alerts.push({
        id: `goal-near-${goal.id}`,
        severity: 'info',
        category: 'goals',
        title: `Meta próxima de 100%: ${goal.name}`,
        description: `Você já atingiu ${goal.progress_percent}%! Faltam apenas ${formatBRL(goal.remaining_amount)}.`,
        amount: goal.remaining_amount,
        actionPath: '/metas',
        actionLabel: 'Ver Meta',
      })
    }
  }

  // Ordena por criticidade e depois por data mais próxima
  return alerts.sort((a, b) => {
    const prioDiff = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity]
    if (prioDiff !== 0) return prioDiff
    if (a.date && b.date) return a.date.localeCompare(b.date)
    if (a.date) return -1
    if (b.date) return 1
    return 0
  })
}
