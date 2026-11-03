import { toCents, fromCents, sumCents } from '@/lib/money'
import type { TransactionWithDetails } from '@/services/transactions'
import type { CreditCardWithLimit } from '@/services/cards'
import type { InvoiceWithTotals } from '@/services/invoices'
import type { RealEstateProperty } from '@/types/database'

export type CalendarEventType = 'income' | 'expense' | 'invoice' | 'property'
export type CalendarEventStatus = 'completed' | 'pending' | 'overdue'

export interface CalendarEventItem {
  id: string
  date: string // YYYY-MM-DD
  title: string
  subtitle?: string
  amount: number
  type: CalendarEventType
  status: CalendarEventStatus
  color?: string | null
  hasAttachment?: boolean
  transaction?: TransactionWithDetails
  invoice?: InvoiceWithTotals
}

export interface CalendarDayCell {
  date: string // YYYY-MM-DD
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEventItem[]
  incomeTotal: number
  expenseTotal: number
  hasOverdue: boolean
}

export interface MonthlyCalendarResult {
  year: number
  month: number // 1..12
  cells: CalendarDayCell[]
  eventsByDate: Record<string, CalendarEventItem[]>
  summary: {
    totalIncome: number
    receivedIncome: number
    pendingIncome: number
    totalOutflows: number
    paidOutflows: number
    pendingOutflows: number
    invoicesTotal: number
    overdueCount: number
    overdueAmount: number
    projectedBalance: number
  }
}

export interface BuildMonthlyCalendarInput {
  year: number
  month: number // 1..12
  todayStr: string
  transactions: TransactionWithDetails[]
  cards: CreditCardWithLimit[]
  invoices: InvoiceWithTotals[]
  properties?: RealEstateProperty[]
}

function formatISO(year: number, month1Based: number, day: number): string {
  return `${year}-${String(month1Based).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function clampDayInMonth(year: number, month1Based: number, desiredDay: number): number {
  const daysInMonth = new Date(Date.UTC(year, month1Based, 0)).getUTCDate()
  return Math.min(Math.max(1, desiredDay), daysInMonth)
}

export function buildMonthlyCalendar({
  year,
  month,
  todayStr,
  transactions,
  cards,
  invoices,
  properties = [],
}: BuildMonthlyCalendarInput): MonthlyCalendarResult {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const eventsByDate: Record<string, CalendarEventItem[]> = {}

  function pushEvent(item: CalendarEventItem) {
    if (!eventsByDate[item.date]) {
      eventsByDate[item.date] = []
    }
    eventsByDate[item.date].push(item)
  }

  // 1. Transações diretas (Receitas e Despesas bancárias, ignorando card_purchase que já entra na Fatura e invoice_payment se já houver fatura paga para não duplicar)
  const paidInvoiceTxIds = new Set<string>(
    invoices
      .map((inv) => inv.payment_transaction_id)
      .filter((id): id is string => Boolean(id))
  )

  for (const tx of transactions) {
    if (tx.status === 'canceled') continue
    if (tx.kind === 'card_purchase' || tx.kind === 'transfer') continue
    if (tx.kind === 'invoice_payment' && paidInvoiceTxIds.has(tx.id)) continue

    if (tx.kind !== 'income' && tx.kind !== 'expense' && tx.kind !== 'invoice_payment') {
      continue
    }

    const eventType: CalendarEventType = tx.kind === 'income' ? 'income' : 'expense'
    const isCompleted = tx.status === 'completed'
    const status: CalendarEventStatus = isCompleted
      ? 'completed'
      : tx.due_date < todayStr
      ? 'overdue'
      : 'pending'

    pushEvent({
      id: `tx-${tx.id}`,
      date: tx.due_date,
      title: tx.description,
      subtitle: tx.category?.name || tx.account?.name || undefined,
      amount: Number(tx.amount),
      type: eventType,
      status,
      color: tx.category?.color || tx.account?.color || null,
      hasAttachment: Boolean(tx.attachment),
      transaction: tx,
    })
  }

  // 2. Faturas de Cartão de Crédito do mês
  const cardsWithInvoiceInMonth = new Set<string>()

  for (const inv of invoices) {
    if (inv.due_date.startsWith(monthPrefix) && inv.total_amount > 0) {
      cardsWithInvoiceInMonth.add(inv.card_id)
      const isPaid = inv.status === 'paid'
      const status: CalendarEventStatus = isPaid
        ? 'completed'
        : inv.due_date < todayStr
        ? 'overdue'
        : 'pending'

      const cardName = inv.card?.name || 'Cartão de Crédito'
      pushEvent({
        id: `inv-${inv.id}`,
        date: inv.due_date,
        title: `Fatura ${cardName}`,
        subtitle: `${inv.transactions_count} ${
          inv.transactions_count === 1 ? 'compra' : 'compras'
        } no ciclo`,
        amount: Number(inv.total_amount),
        type: 'invoice',
        status,
        color: inv.card?.color || '#6366f1',
        invoice: inv,
      })
    }
  }

  // Fallback para cartões ativos com saldo utilizado inicial sem registro em card_invoices neste mês
  const currentYearMonth = todayStr.slice(0, 7)
  if (monthPrefix >= currentYearMonth) {
    for (const card of cards) {
      if (card.is_archived) continue
      if (cardsWithInvoiceInMonth.has(card.id)) continue
      if (card.initial_used_amount <= 0) continue
      // Exibe lembrete de vencimento apenas no mês corrente caso haja saldo inicial em uso
      if (monthPrefix === currentYearMonth) {
        const dueDay = clampDayInMonth(year, month, card.due_day)
        const dueISO = formatISO(year, month, dueDay)
        pushEvent({
          id: `card-cycle-${card.id}-${monthPrefix}`,
          date: dueISO,
          title: `Vencimento ${card.name}`,
          subtitle: 'Limite inicial em uso no cartão',
          amount: Number(card.initial_used_amount),
          type: 'invoice',
          status: dueISO < todayStr ? 'overdue' : 'pending',
          color: card.color || '#6366f1',
        })
      }
    }
  }

  // 3. Parcelas estimadas de Financiamentos Imobiliários ativos (quando não lançadas individualmente)
  const propertyIdsWithTxInMonth = new Set<string>(
    transactions
      .filter((tx) => tx.property_id && tx.due_date.startsWith(monthPrefix))
      .map((tx) => tx.property_id as string)
  )

  for (const prop of properties) {
    const remainingMonths = (prop.total_term_months || 0) - (prop.paid_months || 0)
    if (prop.financed_amount > 0 && remainingMonths > 0 && !propertyIdsWithTxInMonth.has(prop.id)) {
      const purchaseDay = Number(prop.purchase_date?.split('-')[2] || 10)
      const dueDay = clampDayInMonth(year, month, purchaseDay)
      const dueISO = formatISO(year, month, dueDay)
      const estimatedInstallment =
        prop.financed_amount / Math.max(1, prop.total_term_months || 360)

      pushEvent({
        id: `prop-${prop.id}-${monthPrefix}`,
        date: dueISO,
        title: `Financiamento ${prop.name}`,
        subtitle: prop.bank ? `Instituição: ${prop.bank}` : 'Parcela imobiliária prevista',
        amount: fromCents(toCents(estimatedInstallment)),
        type: 'property',
        status: dueISO < todayStr ? 'completed' : 'pending',
        color: '#0ea5e9',
      })
    }
  }

  // Ordena eventos dentro de cada dia (atrasados primeiro, depois pendentes, depois concluídos)
  const statusOrder: Record<CalendarEventStatus, number> = {
    overdue: 0,
    pending: 1,
    completed: 2,
  }
  Object.values(eventsByDate).forEach((list) => {
    list.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  })

  // 4. Monta grade mensal (Domingo = 0 .. Sábado = 6) com 42 células (6 semanas completas)
  const firstDayDate = new Date(Date.UTC(year, month - 1, 1))
  const startWeekday = firstDayDate.getUTCDay() // 0..6
  const gridStartUTC = Date.UTC(year, month - 1, 1 - startWeekday)

  const cells: CalendarDayCell[] = []
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStartUTC + i * 24 * 60 * 60 * 1000)
    const cYear = cellDate.getUTCFullYear()
    const cMonth = cellDate.getUTCMonth() + 1
    const cDay = cellDate.getUTCDate()
    const iso = formatISO(cYear, cMonth, cDay)
    const dayEvents = eventsByDate[iso] || []

    let incCents = 0
    let expCents = 0
    let hasOverdue = false

    for (const ev of dayEvents) {
      if (ev.type === 'income') {
        incCents = sumCents(incCents, toCents(ev.amount))
      } else {
        expCents = sumCents(expCents, toCents(ev.amount))
      }
      if (ev.status === 'overdue') {
        hasOverdue = true
      }
    }

    cells.push({
      date: iso,
      dayOfMonth: cDay,
      isCurrentMonth: cYear === year && cMonth === month,
      isToday: iso === todayStr,
      events: dayEvents,
      incomeTotal: fromCents(incCents),
      expenseTotal: fromCents(expCents),
      hasOverdue,
    })
  }

  // 5. Resumo financeiro estritamente do mês selecionado
  let totalIncomeCents = 0
  let receivedIncomeCents = 0
  let pendingIncomeCents = 0
  let totalOutflowsCents = 0
  let paidOutflowsCents = 0
  let pendingOutflowsCents = 0
  let invoicesTotalCents = 0
  let overdueCount = 0
  let overdueAmountCents = 0

  for (const cell of cells) {
    if (!cell.isCurrentMonth) continue
    for (const ev of cell.events) {
      const cents = toCents(ev.amount)
      if (ev.type === 'income') {
        totalIncomeCents = sumCents(totalIncomeCents, cents)
        if (ev.status === 'completed') {
          receivedIncomeCents = sumCents(receivedIncomeCents, cents)
        } else {
          pendingIncomeCents = sumCents(pendingIncomeCents, cents)
        }
      } else {
        totalOutflowsCents = sumCents(totalOutflowsCents, cents)
        if (ev.type === 'invoice') {
          invoicesTotalCents = sumCents(invoicesTotalCents, cents)
        }
        if (ev.status === 'completed') {
          paidOutflowsCents = sumCents(paidOutflowsCents, cents)
        } else {
          pendingOutflowsCents = sumCents(pendingOutflowsCents, cents)
        }
      }

      if (ev.status === 'overdue') {
        overdueCount += 1
        overdueAmountCents = sumCents(overdueAmountCents, cents)
      }
    }
  }

  return {
    year,
    month,
    cells,
    eventsByDate,
    summary: {
      totalIncome: fromCents(totalIncomeCents),
      receivedIncome: fromCents(receivedIncomeCents),
      pendingIncome: fromCents(pendingIncomeCents),
      totalOutflows: fromCents(totalOutflowsCents),
      paidOutflows: fromCents(paidOutflowsCents),
      pendingOutflows: fromCents(pendingOutflowsCents),
      invoicesTotal: fromCents(invoicesTotalCents),
      overdueCount,
      overdueAmount: fromCents(overdueAmountCents),
      projectedBalance: fromCents(totalIncomeCents - totalOutflowsCents),
    },
  }
}

