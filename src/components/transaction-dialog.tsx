import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  transactionSchema,
  type TransactionFormData,
} from '@/lib/validations/transaction'
import { useTransactions, type TransactionWithDetails } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, ArrowRightLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionToEdit?: TransactionWithDetails | null
  initialKind?: 'income' | 'expense' | 'transfer'
  defaultAccountId?: string
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function TransactionDialog({
  open,
  onOpenChange,
  transactionToEdit,
  initialKind = 'expense',
  defaultAccountId,
}: TransactionDialogProps) {
  const { createTransaction, updateTransaction } = useTransactions()
  const { accounts } = useAccounts()
  const { categoryTree } = useCategories()
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = !!transactionToEdit
  const activeAccounts = accounts.filter((a) => !a.is_archived)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      kind: initialKind,
      description: '',
      amount: 0,
      account_id: defaultAccountId || (activeAccounts[0]?.id ?? ''),
      to_account_id: null,
      category_id: null,
      status: 'completed',
      due_date: getTodayString(),
      paid_date: getTodayString(),
      notes: '',
    },
  })

  const selectedKind = useWatch({ control, name: 'kind', defaultValue: initialKind })
  const selectedStatus = useWatch({ control, name: 'status', defaultValue: 'completed' })
  const selectedAccountId = useWatch({ control, name: 'account_id' })
  const selectedToAccountId = useWatch({ control, name: 'to_account_id' })
  const selectedCategoryId = useWatch({ control, name: 'category_id' })

  // Hierarquia de categorias filtrada pelo tipo atual (income ou expense)
  const currentCategoryTree = categoryTree(
    selectedKind === 'income' ? 'income' : 'expense'
  )

  useEffect(() => {
    if (transactionToEdit) {
      reset({
        kind: (transactionToEdit.kind === 'transfer' ? 'transfer' : transactionToEdit.kind) as 'income' | 'expense' | 'transfer',
        description: transactionToEdit.description,
        amount: Number(transactionToEdit.amount),
        account_id: transactionToEdit.account_id || '',
        to_account_id: transactionToEdit.to_account_id,
        category_id: transactionToEdit.category_id,
        status: transactionToEdit.status === 'canceled' ? 'pending' : transactionToEdit.status,
        due_date: transactionToEdit.due_date,
        paid_date: transactionToEdit.paid_date || transactionToEdit.due_date,
        notes: transactionToEdit.notes || '',
      })
    } else {
      const today = getTodayString()
      reset({
        kind: initialKind,
        description: '',
        amount: 0,
        account_id: defaultAccountId || (activeAccounts[0]?.id ?? ''),
        to_account_id: null,
        category_id: null,
        status: 'completed',
        due_date: today,
        paid_date: today,
        notes: '',
      })
    }
  }, [transactionToEdit, initialKind, defaultAccountId, reset, open, activeAccounts])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: TransactionFormData) {
    setServerError(null)
    try {
      if (isEditing && transactionToEdit) {
        await updateTransaction({
          id: transactionToEdit.id,
          data,
        })
      } else {
        await createTransaction(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar lançamento'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados da movimentação financeira.'
              : 'Registre uma despesa, receita ou transferência entre suas contas.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Seletor de Tipo (Despesa / Receita / Transferência) */}
          {!isEditing && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setValue('kind', 'expense')
                  setValue('to_account_id', null)
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  selectedKind === 'expense'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowUpRight className="size-4" />
                Despesa
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setValue('kind', 'income')
                  setValue('to_account_id', null)
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  selectedKind === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowDownLeft className="size-4" />
                Receita
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setValue('kind', 'transfer')
                  setValue('category_id', null)
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  selectedKind === 'transfer'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-xs'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowRightLeft className="size-4" />
                Transferência
              </button>
            </div>
          )}

          {/* Valor (R$) e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Valor (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="pl-10 text-base font-bold tabular"
                  disabled={isSubmitting}
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-date">
                {selectedKind === 'income' ? 'Data de Recebimento' : 'Data de Vencimento'} *
              </Label>
              <Input
                id="tx-date"
                type="date"
                disabled={isSubmitting}
                {...register('due_date')}
              />
              {errors.due_date && (
                <p className="text-xs text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-description">Descrição *</Label>
            <Input
              id="tx-description"
              placeholder={
                selectedKind === 'transfer'
                  ? 'Ex.: Transferência Nubank para Poupança'
                  : selectedKind === 'income'
                  ? 'Ex.: Salário Mensal, Freelance...'
                  : 'Ex.: Supermercado, Almoço, Conta de Luz...'
              }
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Configuração de Contas */}
          {selectedKind === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-from-account">Conta de Origem (Saída) *</Label>
                <select
                  id="tx-from-account"
                  disabled={isSubmitting}
                  value={selectedAccountId || ''}
                  onChange={(e) => setValue('account_id', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Selecione a conta
                  </option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-xs text-destructive">{errors.account_id.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-to-account">Conta de Destino (Entrada) *</Label>
                <select
                  id="tx-to-account"
                  disabled={isSubmitting}
                  value={selectedToAccountId || ''}
                  onChange={(e) => setValue('to_account_id', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Selecione a conta
                  </option>
                  {activeAccounts
                    .filter((acc) => acc.id !== selectedAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                </select>
                {errors.to_account_id && (
                  <p className="text-xs text-destructive">{errors.to_account_id.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-account">Conta *</Label>
                <select
                  id="tx-account"
                  disabled={isSubmitting}
                  value={selectedAccountId || ''}
                  onChange={(e) => setValue('account_id', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Selecione a conta
                  </option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-xs text-destructive">{errors.account_id.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-category">Categoria</Label>
                <select
                  id="tx-category"
                  disabled={isSubmitting}
                  value={selectedCategoryId || ''}
                  onChange={(e) => setValue('category_id', e.target.value || null)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Sem categoria</option>
                  {currentCategoryTree.map((parent) => (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (Geral)</option>
                      {(parent.children || []).map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          &nbsp;&nbsp;↳ {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status (Efetivado vs Pendente) */}
          <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
            <div>
              <Label className="text-sm font-medium">
                {selectedKind === 'income'
                  ? 'Recebido?'
                  : selectedKind === 'transfer'
                  ? 'Transferência já efetivada?'
                  : 'Pago?'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedStatus === 'completed'
                  ? 'Movimenta o saldo atual imediatamente.'
                  : 'Fica agendado como pendente (saldo previsto).'}
              </p>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const nextStatus = selectedStatus === 'completed' ? 'pending' : 'completed'
                setValue('status', nextStatus)
                if (nextStatus === 'completed') {
                  setValue('paid_date', getTodayString())
                } else {
                  setValue('paid_date', null)
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                selectedStatus === 'completed' ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                  selectedStatus === 'completed' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Observações (Opcional)</Label>
            <Input
              id="tx-notes"
              placeholder="Notas adicionais sobre o lançamento..."
              disabled={isSubmitting}
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
