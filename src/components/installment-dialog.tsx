import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  installmentSchema,
  type InstallmentFormData,
} from '@/lib/validations/installment'
import { useInstallments } from '@/hooks/use-installments'
import { useCards } from '@/hooks/use-cards'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { formatBRL } from '@/lib/money'
import { getTodayDateString } from '@/lib/date'
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
import { AlertCircle, Loader2, CreditCard as CardIcon, FileText } from 'lucide-react'

interface InstallmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCardId?: string
}

export function InstallmentDialog({
  open,
  onOpenChange,
  defaultCardId,
}: InstallmentDialogProps) {
  const { createInstallment } = useInstallments()
  const { cards } = useCards()
  const { accounts } = useAccounts()
  const { categoryTree } = useCategories()
  const [serverError, setServerError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'account'>(
    defaultCardId ? 'card' : 'card'
  )

  const activeCards = cards.filter((c) => !c.is_archived)
  const activeAccounts = accounts.filter((a) => !a.is_archived)
  const expenseCategories = categoryTree('expense')

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      description: '',
      total_amount: 0,
      total_installments: 2,
      card_id: defaultCardId || (activeCards[0]?.id ?? null),
      account_id: null,
      category_id: null,
      start_date: getTodayDateString(),
      notes: '',
    },
  })

  const watchedTotal = useWatch({ control, name: 'total_amount', defaultValue: 0 })
  const watchedInstallments = useWatch({ control, name: 'total_installments', defaultValue: 2 })
  const selectedPaymentMethod = paymentMethod
  const selectedCategoryId = useWatch({ control, name: 'category_id' })

  const calculatedInstallmentAmount =
    watchedTotal > 0 && watchedInstallments > 0
      ? watchedTotal / watchedInstallments
      : 0

  useEffect(() => {
    reset({
      description: '',
      total_amount: 0,
      total_installments: 2,
      card_id: defaultCardId || (activeCards[0]?.id ?? null),
      account_id: null,
      category_id: null,
      start_date: getTodayDateString(),
      notes: '',
    })
  }, [defaultCardId, reset, open, activeCards])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: InstallmentFormData) {
    setServerError(null)
    try {
      await createInstallment(data)
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar parcelamento'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Parcelamento</DialogTitle>
          <DialogDescription>
            Registre compras parceladas no cartão de crédito, carnês, boletos ou financiamentos.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Seletor de Tipo (Cartão de Crédito vs Carnê / Boleto) */}
          <div className="space-y-1.5">
            <Label>Meio de Parcelamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
                disabled={isSubmitting}
                className="text-xs"
                onClick={() => {
                  setPaymentMethod('card')
                  setValue('card_id', activeCards[0]?.id || null)
                  setValue('account_id', null)
                }}
              >
                <CardIcon className="size-4 mr-1.5" />
                Cartão de Crédito
              </Button>
              <Button
                type="button"
                variant={selectedPaymentMethod === 'account' ? 'default' : 'outline'}
                disabled={isSubmitting}
                className="text-xs"
                onClick={() => {
                  setPaymentMethod('account')
                  setValue('card_id', null)
                  setValue('account_id', activeAccounts[0]?.id || null)
                }}
              >
                <FileText className="size-4 mr-1.5" />
                Carnê / Boleto / Conta
              </Button>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="inst-desc">Descrição da Compra *</Label>
            <Input
              id="inst-desc"
              placeholder="Ex.: iPhone 15, Notebook, Reforma do Quarto..."
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Valor Total e Número de Parcelas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inst-amount">Valor Total (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="inst-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="pl-10 font-bold tabular"
                  disabled={isSubmitting}
                  {...register('total_amount', { valueAsNumber: true })}
                />
              </div>
              {errors.total_amount && (
                <p className="text-xs text-destructive">{errors.total_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inst-count">Parcelas *</Label>
              <Input
                id="inst-count"
                type="number"
                min="1"
                max="360"
                disabled={isSubmitting}
                {...register('total_installments', { valueAsNumber: true })}
              />
              {errors.total_installments && (
                <p className="text-xs text-destructive">
                  {errors.total_installments.message}
                </p>
              )}
            </div>
          </div>

          {/* Banner de Cálculo da Parcela */}
          <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Valor estimado de cada parcela:
            </span>
            <span className="font-extrabold tabular text-foreground text-sm">
              {watchedInstallments}x de {formatBRL(calculatedInstallmentAmount)}
            </span>
          </div>

          {/* Vínculo (Cartão ou Conta) */}
          {selectedPaymentMethod === 'card' ? (
            <div className="space-y-1.5">
              <Label htmlFor="inst-card">Cartão de Crédito *</Label>
              <select
                id="inst-card"
                disabled={isSubmitting}
                {...register('card_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione o cartão</option>
                {activeCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.institution || c.brand})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="inst-account">Conta de Débito (Opcional)</Label>
              <select
                id="inst-account"
                disabled={isSubmitting}
                {...register('account_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Nenhuma / Boleto externo</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Categoria e Data da 1ª Parcela */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inst-category">Categoria</Label>
              <select
                id="inst-category"
                disabled={isSubmitting}
                value={selectedCategoryId || ''}
                onChange={(e) => setValue('category_id', e.target.value || null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sem categoria</option>
                {expenseCategories.map((parent) => (
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

            <div className="space-y-1.5">
              <Label htmlFor="inst-date">Vencimento da 1ª Parcela *</Label>
              <Input
                id="inst-date"
                type="date"
                disabled={isSubmitting}
                {...register('start_date')}
              />
            </div>
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
              Cadastrar Parcelamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
