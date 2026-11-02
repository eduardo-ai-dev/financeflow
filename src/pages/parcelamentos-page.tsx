import { useState, useMemo } from 'react'
import { useInstallments, type InstallmentWithDetails } from '@/hooks/use-installments'
import { InstallmentDialog } from '@/components/installment-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { getCategoryIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  CalendarClock,
  Plus,
  CreditCard,
  FileText,
  Search,
  CheckCircle2,
  Calendar,
  XCircle,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ParcelamentosPage() {
  const { installments, isLoading, cancelInstallment } = useInstallments()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active')

  const filteredInstallments = useMemo(() => {
    return installments.filter((item) => {
      if (search && !item.description.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [installments, search, statusFilter])

  // KPIs
  const activeInstallments = useMemo(
    () => installments.filter((i) => i.status === 'active'),
    [installments]
  )

  const totalRemainingDebt = useMemo(() => {
    return activeInstallments.reduce((sum, item) => sum + Number(item.remaining_amount), 0)
  }, [activeInstallments])

  const totalMonthlyCommitment = useMemo(() => {
    return activeInstallments.reduce(
      (sum, item) => sum + Number(item.installment_amount),
      0
    )
  }, [activeInstallments])

  function handleCreate() {
    setDialogOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Central de Parcelamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe compromissos parcelados no cartão, carnês e empréstimos com cronograma e progresso.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs">
          <Plus className="size-4 mr-1.5" />
          Novo Parcelamento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Comprometido Restante */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Dívida Total Restante</span>
            <CalendarClock className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalRemainingDebt)}
          </div>
          <p className="text-[11px] text-muted-foreground">Soma de todas as parcelas futuras</p>
        </div>

        {/* Comprometimento Mensal */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Comprometimento Mensal</span>
            <CreditCard className="size-4 text-amber-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalMonthlyCommitment)}
          </div>
          <p className="text-[11px] text-muted-foreground">Peso fixo das parcelas no mês</p>
        </div>

        {/* Parcelamentos Ativos */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Contratos Ativos</span>
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : activeInstallments.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Compras parceladas em andamento</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar parcelamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="inline-flex rounded-lg border bg-muted/40 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'active'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ativos ({activeInstallments.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'completed'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Concluídos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Lista / Grid de Parcelamentos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : filteredInstallments.length === 0 ? (
        <EmptyState
          title={
            statusFilter === 'completed'
              ? 'Nenhum parcelamento concluído'
              : 'Nenhum parcelamento ativo encontrado'
          }
          description={
            statusFilter === 'completed'
              ? 'Quando todas as parcelas forem pagas, o contrato ficará registrado aqui.'
              : 'Cadastre suas compras parceladas no cartão de crédito, carnês ou acordos para acompanhar a evolução.'
          }
          icon={CalendarClock}
          phase={3}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredInstallments.map((item: InstallmentWithDetails) => {
            const CategoryIcon = getCategoryIcon(item.category?.icon)
            const isCard = !!item.card

            return (
              <div
                key={item.id}
                className="group rounded-2xl border bg-card p-6 shadow-xs transition-all hover:shadow-md space-y-4"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base tracking-tight text-foreground">
                        {item.description}
                      </h3>
                      {item.status === 'completed' && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                          Concluído
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isCard ? (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <CreditCard className="size-3.5 text-primary" />
                          {item.card?.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <FileText className="size-3.5 text-muted-foreground" />
                          Carnê / Conta
                        </span>
                      )}

                      {item.category && (
                        <>
                          <span>&middot;</span>
                          <span className="inline-flex items-center gap-1">
                            <CategoryIcon className="size-3" />
                            {item.category.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {item.status === 'active' && (
                        <DropdownMenuItem
                          onClick={() => cancelInstallment(item.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="size-4 mr-2" />
                          Cancelar Parcelamento
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Barra de Progresso das Parcelas */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Progresso:{' '}
                      <strong className="text-foreground">
                        {item.paid_installments} de {item.total_installments} pagas
                      </strong>
                    </span>
                    <span className="font-extrabold tabular text-primary">
                      {item.progress_percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${item.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground">Valor da Parcela:</span>
                    <div className="tabular font-bold text-sm text-foreground mt-0.5">
                      {formatBRL(item.installment_amount)}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Saldo Restante:</span>
                    <div className="tabular font-bold text-sm text-rose-600 dark:text-rose-400 mt-0.5">
                      {formatBRL(item.remaining_amount)}
                    </div>
                  </div>
                </div>

                {/* Rodapé: Datas */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Início: {formatDate(item.start_date)}
                  </span>
                  <span>Término: {formatDate(item.end_date)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog de Novo Parcelamento */}
      <InstallmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
export { ParcelamentosPage }
