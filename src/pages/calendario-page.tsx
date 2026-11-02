import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { useInvoices } from '@/hooks/use-invoices'
import { useProperties } from '@/hooks/use-properties'
import { createReceiptSignedUrl } from '@/services/attachments'
import {
  buildMonthlyCalendar,
  type CalendarEventItem,
  type CalendarEventType,
} from '@/lib/calendar'
import { formatBRL } from '@/lib/money'
import { formatDate, formatMonthYear, getTodayDateString } from '@/lib/date'
import { TransactionDialog } from '@/components/transaction-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Paperclip,
  Edit2,
  Undo2,
  Loader2,
  ArrowRight,
} from 'lucide-react'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type FilterType = 'all' | 'income' | 'expense' | 'invoice'

export default function CalendarioPage() {
  const {
    transactions,
    isLoading: loadingTx,
    markAsCompleted,
    markAsPending,
  } = useTransactions()
  const { cards, isLoading: loadingCards } = useCards()
  const { invoices, isLoading: loadingInvoices } = useInvoices()
  const { properties, isLoading: loadingProperties } = useProperties()

  const [todayStr] = useState(() => getTodayDateString())
  const [viewYear, setViewYear] = useState<number>(() => Number(todayStr.split('-')[0]))
  const [viewMonth, setViewMonth] = useState<number>(() => Number(todayStr.split('-')[1]))
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr)
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<TransactionWithDetails | null>(null)
  const [txInitialKind, setTxInitialKind] = useState<'income' | 'expense'>('expense')
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null)

  const isLoading = loadingTx || loadingCards || loadingInvoices || loadingProperties

  const calendar = useMemo(
    () =>
      buildMonthlyCalendar({
        year: viewYear,
        month: viewMonth,
        todayStr,
        transactions,
        cards,
        invoices,
        properties,
      }),
    [viewYear, viewMonth, todayStr, transactions, cards, invoices, properties]
  )

  const monthTitle = useMemo(() => {
    const isoFirst = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`
    return formatMonthYear(isoFirst)
  }, [viewYear, viewMonth])

  function matchesFilter(ev: CalendarEventItem): boolean {
    if (typeFilter === 'all') return true
    if (typeFilter === 'income') return ev.type === 'income'
    if (typeFilter === 'invoice') return ev.type === 'invoice'
    return ev.type === 'expense' || ev.type === 'property'
  }

  const selectedDayEvents = useMemo(() => {
    const raw = calendar.eventsByDate[selectedDate] || []
    return raw.filter(matchesFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar.eventsByDate, selectedDate, typeFilter])

  function handlePrevMonth() {
    let nextYear = viewYear
    let nextMonth = viewMonth - 1
    if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    }
    setViewYear(nextYear)
    setViewMonth(nextMonth)
    setSelectedDate(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)
  }

  function handleNextMonth() {
    let nextYear = viewYear
    let nextMonth = viewMonth + 1
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    setViewYear(nextYear)
    setViewMonth(nextMonth)
    setSelectedDate(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)
  }

  function handleGoToday() {
    const [y, m] = todayStr.split('-').map(Number)
    setViewYear(y)
    setViewMonth(m)
    setSelectedDate(todayStr)
  }

  function handleOpenNewForDate(kind: 'income' | 'expense' = 'expense') {
    setTxToEdit(null)
    setTxInitialKind(kind)
    setDialogOpen(true)
  }

  function handleEditTx(tx: TransactionWithDetails) {
    setTxToEdit(tx)
    setDialogOpen(true)
  }

  async function handleToggleTxStatus(tx: TransactionWithDetails) {
    if (tx.status === 'completed') {
      await markAsPending(tx.id)
    } else {
      await markAsCompleted({ id: tx.id })
    }
  }

  async function handleOpenAttachment(tx: TransactionWithDetails) {
    if (!tx.attachment?.path) return
    setOpeningReceiptId(tx.id)
    try {
      const url = await createReceiptSignedUrl(tx.attachment.path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Silencioso
    } finally {
      setOpeningReceiptId(null)
    }
  }

  function getEventPillStyle(type: CalendarEventType, status: CalendarEventItem['status']) {
    if (status === 'overdue') {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
    }
    if (type === 'income') {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
    }
    if (type === 'invoice') {
      return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25'
    }
    if (type === 'property') {
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25'
    }
    return status === 'completed'
      ? 'bg-muted text-muted-foreground border-border'
      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Calendário Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão mensal de vencimentos de contas, faturas de cartão e recebimentos previstos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewForDate('income')}
            className="text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <ArrowDownLeft className="size-3.5 mr-1.5" />
            + Recebimento
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenNewForDate('expense')}
            className="text-xs font-semibold"
          >
            <Plus className="size-3.5 mr-1.5" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* KPIs do Mês Selecionado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="px-5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Recebimentos no Mês</span>
              <ArrowDownLeft className="size-4 text-emerald-500" />
            </div>
            <div className="tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                formatBRL(calendar.summary.totalIncome)
              )}
            </div>
            <p className="text-[11px] text-muted-foreground tabular">
              {formatBRL(calendar.summary.pendingIncome)} ainda a receber
            </p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="px-5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Contas & Compromissos</span>
              <ArrowUpRight className="size-4 text-rose-500" />
            </div>
            <div className="tabular text-2xl font-bold text-rose-600 dark:text-rose-400">
              {isLoading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                formatBRL(calendar.summary.totalOutflows)
              )}
            </div>
            <p className="text-[11px] text-muted-foreground tabular">
              {formatBRL(calendar.summary.pendingOutflows)} em aberto no período
            </p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="px-5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Faturas no Mês</span>
              <CreditCard className="size-4 text-indigo-500" />
            </div>
            <div className="tabular text-2xl font-bold text-foreground">
              {isLoading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                formatBRL(calendar.summary.invoicesTotal)
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Vencimentos de cartões neste ciclo
            </p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="px-5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>
                {calendar.summary.overdueCount > 0 ? 'Em Atraso no Mês' : 'Saldo Projetado'}
              </span>
              {calendar.summary.overdueCount > 0 ? (
                <AlertTriangle className="size-4 text-rose-500" />
              ) : (
                <CalendarDays className="size-4 text-primary" />
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : calendar.summary.overdueCount > 0 ? (
              <>
                <div className="tabular text-2xl font-bold text-rose-500">
                  {formatBRL(calendar.summary.overdueAmount)}
                </div>
                <p className="text-[11px] text-rose-500 font-medium">
                  {calendar.summary.overdueCount}{' '}
                  {calendar.summary.overdueCount === 1
                    ? 'compromisso vencido'
                    : 'compromissos vencidos'}
                </p>
              </>
            ) : (
              <>
                <div
                  className={`tabular text-2xl font-bold ${
                    calendar.summary.projectedBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  {formatBRL(calendar.summary.projectedBalance, { showSign: true })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Nenhum vencimento em atraso
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de Navegação Mensal + Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="inline-flex items-center rounded-xl border bg-background p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="size-8"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-3 text-sm font-bold tracking-tight min-w-[150px] text-center">
              {monthTitle}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="size-8"
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToday}
            className="h-9 text-xs font-semibold"
          >
            Hoje
          </Button>
        </div>

        {/* Filtros por Tipo */}
        <div className="inline-flex flex-wrap rounded-xl border bg-muted/40 p-1 gap-1">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'income', label: 'Recebimentos' },
              { key: 'expense', label: 'Contas' },
              { key: 'invoice', label: 'Faturas' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTypeFilter(item.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                typeFilter === item.key
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Principal: Grade Mensal + Painel Lateral do Dia Selecionado */}
      <div className="grid grid-cols-1 xl:grid-cols-7 gap-6 items-start">
        {/* Grade do Calendário (5 colunas no desktop XL) */}
        <div className="xl:col-span-5 rounded-2xl border bg-card overflow-hidden shadow-xs">
          {/* Cabeçalho de Dias da Semana */}
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Células de Dias (42 células) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {calendar.cells.map((cell) => {
              const visibleEvents = cell.events.filter(matchesFilter)
              const isSelected = cell.date === selectedDate

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`min-h-[84px] sm:min-h-[112px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors cursor-pointer focus:outline-hidden ${
                    !cell.isCurrentMonth
                      ? 'bg-muted/20 text-muted-foreground/50 hover:bg-muted/40'
                      : isSelected
                      ? 'bg-primary/[0.06] ring-2 ring-inset ring-primary'
                      : 'bg-card hover:bg-muted/25'
                  }`}
                >
                  {/* Topo da Célula: Número do Dia + Indicador Hoje/Atraso */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold tabular ${
                        cell.isToday
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : isSelected
                          ? 'text-primary'
                          : cell.isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50'
                      }`}
                    >
                      {cell.dayOfMonth}
                    </span>

                    {cell.hasOverdue && cell.isCurrentMonth && (
                      <span
                        className="size-2 rounded-full bg-rose-500 animate-pulse"
                        title="Possui compromisso em atraso"
                      />
                    )}
                  </div>

                  {/* Eventos no Desktop (pílulas compactas) */}
                  <div className="hidden sm:flex flex-col gap-1 mt-1.5 w-full overflow-hidden">
                    {visibleEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight ${getEventPillStyle(
                          ev.type,
                          ev.status
                        )}`}
                      >
                        <span className="font-semibold">
                          {ev.type === 'income' ? '+' : '-'}
                        </span>{' '}
                        {ev.title}
                      </div>
                    ))}
                    {visibleEvents.length > 2 && (
                      <span className="text-[10px] font-semibold text-muted-foreground pl-1">
                        +{visibleEvents.length - 2} mais
                      </span>
                    )}
                  </div>

                  {/* Indicadores compactos no Mobile (pontos coloridos) */}
                  {visibleEvents.length > 0 && (
                    <div className="flex sm:hidden items-center gap-1 mt-auto pt-1 flex-wrap">
                      {visibleEvents.slice(0, 4).map((ev) => (
                        <span
                          key={ev.id}
                          className={`size-1.5 rounded-full ${
                            ev.status === 'overdue'
                              ? 'bg-rose-500'
                              : ev.type === 'income'
                              ? 'bg-emerald-500'
                              : ev.type === 'invoice'
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                        />
                      ))}
                      {visibleEvents.length > 4 && (
                        <span className="text-[9px] font-bold text-muted-foreground">
                          +{visibleEvents.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Painel Lateral: Detalhes do Dia Selecionado (2 colunas no desktop XL) */}
        <div className="xl:col-span-2 rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {selectedDate === todayStr ? 'Agenda de Hoje' : 'Dia Selecionado'}
              </span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {formatDate(selectedDate)}
              </h2>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenNewForDate('expense')}
              className="h-8 text-xs gap-1"
            >
              <Plus className="size-3.5" />
              Agendar
            </Button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <CalendarDays className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Dia livre de vencimentos
                </p>
                <p className="text-xs text-muted-foreground">
                  Nenhuma movimentação prevista para {formatDate(selectedDate)}.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenNewForDate('income')}
                  className="h-8 text-xs"
                >
                  + Receita
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenNewForDate('expense')}
                  className="h-8 text-xs"
                >
                  + Despesa
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((ev) => {
                const isIncome = ev.type === 'income'
                const isInvoice = ev.type === 'invoice'
                const isProperty = ev.type === 'property'

                return (
                  <div
                    key={ev.id}
                    className="rounded-xl border bg-muted/15 p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isIncome
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : isInvoice
                              ? 'bg-indigo-500/15 text-indigo-500'
                              : isProperty
                              ? 'bg-sky-500/15 text-sky-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="size-4" />
                          ) : isInvoice ? (
                            <CreditCard className="size-4" />
                          ) : isProperty ? (
                            <Building2 className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {ev.title}
                          </p>
                          {ev.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ev.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`tabular text-sm font-bold ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {formatBRL(ev.amount)}
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-0.5 text-[10px] h-4 px-1.5 ${
                            ev.status === 'completed'
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : ev.status === 'overdue'
                              ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                              : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                          }`}
                        >
                          {ev.status === 'completed' ? (
                            <span className="inline-flex items-center gap-0.5">
                              <CheckCircle2 className="size-2.5" />
                              {isIncome ? 'Recebido' : 'Pago'}
                            </span>
                          ) : ev.status === 'overdue' ? (
                            <span className="inline-flex items-center gap-0.5">
                              <AlertTriangle className="size-2.5" />
                              Atrasado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="size-2.5" />
                              Pendente
                            </span>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Ações Rápidas do Item */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                      {ev.transaction ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleTxStatus(ev.transaction!)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {ev.transaction.status === 'completed' ? (
                              <>
                                <Undo2 className="size-3" />
                                Voltar p/ pendente
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3" />
                                {isIncome ? 'Confirmar recebimento' : 'Marcar como pago'}
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            {ev.hasAttachment && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-primary"
                                disabled={openingReceiptId === ev.transaction.id}
                                onClick={() => handleOpenAttachment(ev.transaction!)}
                                title="Abrir comprovante"
                              >
                                {openingReceiptId === ev.transaction.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Paperclip className="size-3.5" />
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditTx(ev.transaction!)}
                              title="Editar lançamento"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : isInvoice ? (
                        <Link
                          to="/cartoes"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Gerenciar fatura em Cartões
                          <ArrowRight className="size-3" />
                        </Link>
                      ) : (
                        <Link
                          to="/imoveis"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Ver detalhes em Imóveis
                          <ArrowRight className="size-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactionToEdit={txToEdit}
        initialKind={txInitialKind}
        defaultDueDate={selectedDate}
      />
    </div>
  )
}
