import { useState, useMemo } from 'react'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { TransactionsTable } from '@/components/transactions-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { formatBRL } from '@/lib/money'
import { getTodayDateString } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Receipt,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'

export default function ContasAPagarPage() {
  const {
    transactions,
    isLoading,
    markAsCompleted,
    markAsPending,
    deleteTransaction,
  } = useTransactions()

  const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('payable')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<TransactionWithDetails | null>(null)
  const [todayStr] = useState(() => getTodayDateString())

  const relevantKind = activeTab === 'payable' ? 'expense' : 'income'

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.kind !== relevantKind) return false
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, relevantKind, statusFilter, search])

  // KPIs
  const totalPendingPayable = useMemo(() => {
    return transactions
      .filter((t) => t.kind === 'expense' && t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }, [transactions])

  const totalOverduePayable = useMemo(() => {
    return transactions
      .filter((t) => t.kind === 'expense' && t.status === 'pending' && t.due_date < todayStr)
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }, [transactions, todayStr])

  const totalPendingReceivable = useMemo(() => {
    return transactions
      .filter((t) => t.kind === 'income' && t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }, [transactions])

  const netPending = totalPendingReceivable - totalPendingPayable

  function handleCreate() {
    setTxToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(tx: TransactionWithDetails) {
    setTxToEdit(tx)
    setDialogOpen(true)
  }

  async function handleToggleStatus(tx: TransactionWithDetails) {
    if (tx.status === 'completed') {
      await markAsPending(tx.id)
    } else {
      await markAsCompleted({ id: tx.id })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="size-7 text-primary" />
            Contas a Pagar & Receber
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão operacional de compromissos pendentes, liquidações e contas a compensar.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs font-semibold gap-1.5">
          <Plus className="size-4" />
          {activeTab === 'payable' ? 'Nova Conta a Pagar' : 'Novo Título a Receber'}
        </Button>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Contas a Pagar</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="tabular text-2xl font-bold text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalPendingPayable)}
          </div>
          <p className="text-[11px] text-muted-foreground">Compromissos pendentes</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Contas Vencidas</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold text-rose-500">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalOverduePayable)}
          </div>
          <p className="text-[11px] text-rose-500 font-medium">Exigem regularização imediata</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Contas a Receber</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalPendingReceivable)}
          </div>
          <p className="text-[11px] text-muted-foreground">Previsão de entradas</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Saldo Líquido Previsto</span>
            <Receipt className="size-4 text-primary" />
          </div>
          <div
            className={`tabular text-2xl font-bold ${
              netPending >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(netPending, { showSign: true })}
          </div>
          <p className="text-[11px] text-muted-foreground">Recebíveis − Obrigações</p>
        </div>
      </div>

      {/* Alternador de Abas: Contas a Pagar vs Contas a Receber */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/40 border sm:w-80">
          <button
            type="button"
            onClick={() => setActiveTab('payable')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'payable'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="size-3.5 text-rose-500" />
            Contas a Pagar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receivable')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'receivable'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownLeft className="size-3.5 text-emerald-500" />
            Contas a Receber
          </button>
        </div>

        {/* Filtro de Status e Busca */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="inline-flex rounded-lg border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'pending'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground'
              }`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'completed'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground'
              }`}
            >
              Liquidadas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground'
              }`}
            >
              Todas
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <TransactionsTable
        transactions={filteredTransactions}
        isLoading={isLoading}
        kindContext={activeTab === 'payable' ? 'expense' : 'income'}
        onEdit={handleEdit}
        onDelete={deleteTransaction}
        onToggleStatus={handleToggleStatus}
      />

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactionToEdit={txToEdit}
        initialKind={activeTab === 'payable' ? 'expense' : 'income'}
      />
    </div>
  )
}
