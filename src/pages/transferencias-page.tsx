import { useState, useMemo } from 'react'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { TransactionsTable } from '@/components/transactions-table'
import { TransactionDialog } from '@/components/transaction-dialog'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowRightLeft,
  Plus,
  Landmark,
  ShieldCheck,
  Coins,
} from 'lucide-react'

export default function TransferenciasPage() {
  const { transactions, isLoading, markAsCompleted, markAsPending, deleteTransaction } =
    useTransactions({ kind: 'transfer' })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<TransactionWithDetails | null>(null)

  const totalTransferred = useMemo(() => {
    return transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  }, [transactions])

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
            <ArrowRightLeft className="size-7 text-primary" />
            Transferências entre Contas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Movimentações internas de liquidez, aportes em reservas e transferências bancárias neutras.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs font-semibold gap-1.5">
          <Plus className="size-4" />
          Nova Transferência
        </Button>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Volume Movimentado</span>
            <Coins className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalTransferred)}
          </div>
          <p className="text-[11px] text-muted-foreground">Transferências internas (neutras no DRE)</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Operações Registradas</span>
            <Landmark className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : transactions.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Fluxos entre contas e cofres</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Impacto no DRE</span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ 0,00
          </div>
          <p className="text-[11px] text-muted-foreground">Transferências não alteram o resultado líquido</p>
        </div>
      </div>

      {/* Lista de Transferências */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Histórico de Transferências
          </h2>
          <span className="text-xs text-muted-foreground">{transactions.length} registros</span>
        </div>

        <TransactionsTable
          transactions={transactions}
          isLoading={isLoading}
          kindContext="all"
          onEdit={handleEdit}
          onDelete={deleteTransaction}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactionToEdit={txToEdit}
        initialKind="transfer"
      />
    </div>
  )
}

