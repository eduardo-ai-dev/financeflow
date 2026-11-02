import { useState } from 'react'
import type { TransactionWithDetails } from '@/services/transactions'
import { formatBRL } from '@/lib/money'
import { formatDate, getTodayDateString } from '@/lib/date'
import { getCategoryIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  Undo2,
  ArrowRightLeft,
} from 'lucide-react'

interface TransactionsTableProps {
  transactions: TransactionWithDetails[]
  isLoading?: boolean
  kindContext?: 'income' | 'expense' | 'all'
  onEdit?: (tx: TransactionWithDetails) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (tx: TransactionWithDetails) => void
}

export function TransactionsTable({
  transactions,
  isLoading,
  kindContext: _kindContext = 'all',
  onEdit,
  onDelete,
  onToggleStatus,
}: TransactionsTableProps) {
  const [todayStr] = useState(() => getTodayDateString())

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-xl border bg-card"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
      {/* Desktop Table View */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Conta</th>
              <th className="py-3 px-4 text-right">Valor</th>
              <th className="py-3 px-4 text-center w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => {
              const CategoryIcon = getCategoryIcon(tx.category?.icon)
              const isOverdue = tx.status === 'pending' && tx.due_date < todayStr
              const isIncome = tx.kind === 'income'
              const isTransfer = tx.kind === 'transfer'

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Status & Quick Toggle */}
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(tx)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 transition-transform hover:scale-105"
                      title={
                        tx.status === 'completed'
                          ? 'Clique para voltar para pendente'
                          : 'Clique para marcar como efetivado'
                      }
                    >
                      {tx.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-3.5" />
                          {isIncome ? 'Recebido' : 'Pago'}
                        </span>
                      ) : isOverdue ? (
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="size-3.5" />
                          Atrasado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <Clock className="size-3.5" />
                          Pendente
                        </span>
                      )}
                    </button>
                  </td>

                  {/* Data */}
                  <td className="py-3.5 px-4 tabular text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(tx.due_date)}
                  </td>

                  {/* Descrição */}
                  <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                    <span>{tx.description}</span>
                    {tx.notes && (
                      <p className="text-[11px] text-muted-foreground truncate">{tx.notes}</p>
                    )}
                  </td>

                  {/* Categoria */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isTransfer ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded-md">
                        <ArrowRightLeft className="size-3" />
                        Transferência
                      </span>
                    ) : tx.category ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: tx.category.color || '#10b981' }}
                        />
                        <CategoryIcon className="size-3.5 text-muted-foreground" />
                        <span>{tx.category.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem categoria</span>
                    )}
                  </td>

                  {/* Conta */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isTransfer ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{tx.account?.name}</span>
                        <span>→</span>
                        <span className="font-medium text-foreground">{tx.to_account?.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: tx.account?.color || '#10b981' }}
                        />
                        <span className="text-foreground">{tx.account?.name || '—'}</span>
                      </div>
                    )}
                  </td>

                  {/* Valor */}
                  <td className="py-3.5 px-4 text-right tabular font-bold text-sm whitespace-nowrap">
                    <span
                      className={
                        isTransfer
                          ? 'text-blue-600 dark:text-blue-400'
                          : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {isTransfer ? '' : isIncome ? '+ ' : '- '}
                      {formatBRL(tx.amount)}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onToggleStatus?.(tx)}>
                          {tx.status === 'completed' ? (
                            <>
                              <Undo2 className="size-4 mr-2" />
                              Desmarcar (voltar a pendente)
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4 mr-2 text-emerald-500" />
                              {isIncome ? 'Marcar como Recebido' : 'Marcar como Pago'}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(tx)}>
                          <Edit2 className="size-4 mr-2" />
                          Editar Lançamento
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(tx.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-border">
        {transactions.map((tx) => {
          const CategoryIcon = getCategoryIcon(tx.category?.icon)
          const isOverdue = tx.status === 'pending' && tx.due_date < todayStr
          const isIncome = tx.kind === 'income'
          const isTransfer = tx.kind === 'transfer'

          return (
            <div key={tx.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {tx.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(tx.due_date)}</span>
                    <span>&middot;</span>
                    <span>{tx.account?.name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`tabular font-bold text-sm ${
                      isTransfer
                        ? 'text-blue-600 dark:text-blue-400'
                        : isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isTransfer ? '' : isIncome ? '+ ' : '- '}
                    {formatBRL(tx.amount)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {tx.category ? (
                    <span className="inline-flex items-center gap-1">
                      <CategoryIcon className="size-3.5" />
                      <span>{tx.category.name}</span>
                    </span>
                  ) : isTransfer ? (
                    <span>Transferência</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(tx)}
                    className="text-xs"
                  >
                    {tx.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="size-3" />
                        {isIncome ? 'Recebido' : 'Pago'}
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="size-3" />
                        Atrasado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                        <Clock className="size-3" />
                        Pendente
                      </span>
                    )}
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreVertical className="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(tx)}>
                        <Edit2 className="size-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(tx.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
