import { useState, useMemo } from 'react'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { TransactionsTable } from '@/components/transactions-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Repeat,
  Plus,
  Tv,
  CalendarCheck2,
  Percent,
} from 'lucide-react'

export default function RecorrenciasPage() {
  const { transactions, isLoading, markAsCompleted, markAsPending, deleteTransaction } =
    useTransactions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<TransactionWithDetails | null>(null)

  // Filtra transações fixas e recorrentes (assinaturas, moradia, planos)
  const recurringExpenses = useMemo(() => {
    return transactions.filter(
      (t) => t.kind === 'expense' && t.expense_classification === 'fixed'
    )
  }, [transactions])

  const recurringIncomes = useMemo(() => {
    return transactions.filter((t) => t.kind === 'income')
  }, [transactions])

  const totalMonthlyRecurringExpense = useMemo(() => {
    return recurringExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
  }, [recurringExpenses])

  const totalMonthlyRecurringIncome = useMemo(() => {
    return recurringIncomes.reduce((sum, t) => sum + Number(t.amount), 0)
  }, [recurringIncomes])

  const commitmentRate = useMemo(() => {
    if (totalMonthlyRecurringIncome <= 0) return 0
    return Math.min(100, Math.round((totalMonthlyRecurringExpense / totalMonthlyRecurringIncome) * 100))
  }, [totalMonthlyRecurringExpense, totalMonthlyRecurringIncome])

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
            <Repeat className="size-7 text-primary" />
            Recorrências & Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controle custos fixos mensais, planos recorrentes, moradia e serviços por assinatura.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs font-semibold gap-1.5">
          <Plus className="size-4" />
          Nova Recorrência
        </Button>
      </div>

      {/* Grid de Indicadores de Recorrência */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Custo Fixo Recorrente</span>
            <Tv className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold text-rose-600 dark:text-rose-400">
            {isLoading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : (
              formatBRL(totalMonthlyRecurringExpense)
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Gastos com renovação mensal automática</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Comprometimento Fixo</span>
            <Percent className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : `${commitmentRate}%`}
          </div>
          <p className="text-[11px] text-muted-foreground">Porcentagem das receitas já comprometida</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Contratos Mapeados</span>
            <CalendarCheck2 className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              `${recurringExpenses.length} ${
                recurringExpenses.length === 1 ? 'assinatura' : 'assinaturas'
              }`
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Classificados como despesa fixa</p>
        </div>
      </div>

      {/* Lista de Recorrências */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Contratos e Contas com Renovação Periódica
          </h2>
          <span className="text-xs text-muted-foreground">
            {recurringExpenses.length} itens cadastrados
          </span>
        </div>

        <TransactionsTable
          transactions={recurringExpenses}
          isLoading={isLoading}
          kindContext="expense"
          onEdit={handleEdit}
          onDelete={deleteTransaction}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactionToEdit={txToEdit}
        initialKind="expense"
      />
    </div>
  )
}

