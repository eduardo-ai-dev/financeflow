import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { TransactionsTable } from '@/components/transactions-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowDownLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  Upload,
} from 'lucide-react'

export default function EntradasPage() {
  const {
    transactions,
    isLoading,
    markAsCompleted,
    markAsPending,
    deleteTransaction,
  } = useTransactions({ kind: 'income' })

  const { accounts } = useAccounts()
  const { categoryTree } = useCategories()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')

  const [dialogOpen, setDialogOpen] = useState(() => searchParams.get('action') === 'new')
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithDetails | null>(null)

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('action')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const incomeCategories = useMemo(() => categoryTree('income'), [categoryTree])

  // Filtragem local refinada
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (statusFilter !== 'all' && tx.status !== statusFilter) {
        return false
      }
      if (selectedAccountId !== 'all' && tx.account_id !== selectedAccountId) {
        return false
      }
      if (selectedCategoryId !== 'all' && tx.category_id !== selectedCategoryId) {
        return false
      }
      return true
    })
  }, [transactions, search, statusFilter, selectedAccountId, selectedCategoryId])

  // KPIs
  const totalReceived = useMemo(() => {
    return transactions
      .filter((tx) => tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  }, [transactions])

  const totalPending = useMemo(() => {
    return transactions
      .filter((tx) => tx.status === 'pending')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  }, [transactions])

  const totalOverall = totalReceived + totalPending

  function handleCreate() {
    setTransactionToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(tx: TransactionWithDetails) {
    setTransactionToEdit(tx)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Entradas & Receitas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe salários, honorários, rendimentos e contas a receber.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvImportOpen(true)}
            className="text-xs gap-1.5"
          >
            <Upload className="size-3.5 text-primary" />
            Importar CSV
          </Button>
          <Button onClick={handleCreate} size="sm" className="text-xs">
            <Plus className="size-4 mr-1.5" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recebido */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Recebido (Efetivado)</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalReceived)}
          </div>
          <p className="text-[11px] text-muted-foreground">Já creditado no saldo das contas</p>
        </div>

        {/* A Receber */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>A Receber (Pendente)</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalPending)}
          </div>
          <p className="text-[11px] text-muted-foreground">Previsto até a data de vencimento</p>
        </div>

        {/* Total do Período */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Total Previsto</span>
            <Coins className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalOverall)}
          </div>
          <p className="text-[11px] text-muted-foreground">Efetivado + pendente</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Busca e Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar receita..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="inline-flex rounded-lg border bg-muted/40 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'completed'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recebidas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'pending'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>

        {/* Filtro por Conta e Categoria */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Todas as Contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Todas as Categorias</option>
            {incomeCategories.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>{parent.name}</option>
                {(parent.children || []).map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    ↳ {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo: Tabela ou Estado Vazio */}
      {!isLoading && transactions.length === 0 ? (
        <EmptyState
          title="Nenhuma receita registrada"
          description="Lance seus salários, rendimentos e outras receitas para acompanhar a evolução do seu fluxo de caixa."
          icon={ArrowDownLeft}
          phase={2}
        />
      ) : !isLoading && filteredTransactions.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento corresponde aos filtros"
          description="Tente ajustar a busca ou os seletores de status, conta ou categoria."
          icon={Search}
          phase={2}
        />
      ) : (
        <TransactionsTable
          transactions={filteredTransactions}
          isLoading={isLoading}
          kindContext="income"
          onEdit={handleEdit}
          onDelete={deleteTransaction}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Modal Dialog */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactionToEdit={transactionToEdit}
        initialKind="income"
      />

      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        defaultAccountId={selectedAccountId !== 'all' ? selectedAccountId : undefined}
      />
    </div>
  )
}
export { EntradasPage }
