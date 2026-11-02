import { useState, useEffect, useMemo } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Loader2, CreditCard as CardIcon, FileText, ShieldCheck } from 'lucide-react'

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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'account'>('card')

  const activeCards = useMemo(() => cards.filter((c) => !c.is_archived), [cards])
  const activeAccounts = useMemo(() => accounts.filter((a) => !a.is_archived), [accounts])
  const expenseCategories = useMemo(() => categoryTree('expense'), [categoryTree])

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
      total_amount: undefined as unknown as number,
      total_installments: 2,
      card_id: defaultCardId || (activeCards[0]?.id ?? null),
      account_id: null,
      category_id: null,
      start_date: getTodayDateString(),
      already_included_in_limit: false,
      notes: '',
    },
  })

  const watchedTotal = useWatch({ control, name: 'total_amount', defaultValue: 0 })
  const watchedInstallments = useWatch({ control, name: 'total_installments', defaultValue: 2 })
  const selectedCardId = useWatch({ control, name: 'card_id' })
  const selectedCategoryId = useWatch({ control, name: 'category_id' })
  const alreadyIncludedInLimit = useWatch({
    control,
    name: 'already_included_in_limit',
    defaultValue: false,
  })

  const selectedCard = useMemo(
    () => activeCards.find((c) => c.id === selectedCardId) ?? null,
    [activeCards, selectedCardId]
  )

  const calculatedInstallmentAmount =
    Number.isFinite(watchedTotal) && watchedTotal > 0 && watchedInstallments > 0
      ? watchedTotal / watchedInstallments
      : 0

  useEffect(() => {
    if (!open) return
    setServerError(null)
    const initialMethod = activeCards.length > 0 || defaultCardId ? 'card' : 'account'
    setPaymentMethod(initialMethod)
    reset({
      description: '',
      total_amount: undefined as unknown as number,
      total_installments: 2,
      card_id:
        initialMethod === 'card'
          ? defaultCardId || (activeCards[0]?.id ?? null)
          : null,
      account_id:
        initialMethod === 'account' ? (activeAccounts[0]?.id ?? null) : null,
      category_id: null,
      start_date: getTodayDateString(),
      already_included_in_limit: false,
      notes: '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCardId, reset])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: InstallmentFormData) {
    setServerError(null)

    if (paymentMethod === 'card' && !data.card_id) {
      setServerError('Selecione o cartão de crédito utilizado neste parcelamento.')
      return
    }

    try {
      await createInstallment({
        ...data,
        card_id: paymentMethod === 'card' ? data.card_id : null,
        account_id: paymentMethod === 'account' ? data.account_id : null,
        already_included_in_limit:
          paymentMethod === 'card' ? Boolean(data.already_included_in_limit) : false,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar parcelamento'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Parcelamento</DialogTitle>
          <DialogDescription>
            Registre compras parceladas no cartão de crédito, carnês, boletos ou financiamentos.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Seletor de Tipo (Cartão de Crédito vs Carnê / Boleto) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Meio de Parcelamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                disabled={isSubmitting}
                className="h-9 text-xs"
                onClick={() => {
                  setPaymentMethod('card')
                  setValue('card_id', activeCards[0]?.id || null, { shouldValidate: true })
                  setValue('account_id', null)
                }}
              >
                <CardIcon className="size-4 mr-1.5" />
                Cartão de Crédito
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'account' ? 'default' : 'outline'}
                disabled={isSubmitting}
                className="h-9 text-xs"
                onClick={() => {
                  setPaymentMethod('account')
                  setValue('card_id', null)
                  setValue('already_included_in_limit', false)
                  setValue('account_id', activeAccounts[0]?.id || null, { shouldValidate: true })
                }}
              >
                <FileText className="size-4 mr-1.5" />
                Carnê / Boleto / Conta
              </Button>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="inst-desc" className="text-xs">
              Descrição da Compra *
            </Label>
            <Input
              id="inst-desc"
              placeholder="Ex.: iPhone 15, Notebook, Reforma do Quarto..."
              disabled={isSubmitting}
              className="h-9"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Valor Total e Número de Parcelas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inst-amount" className="text-xs">
                Valor Total (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="inst-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="pl-9 h-9 font-semibold tabular"
                  disabled={isSubmitting}
                  {...register('total_amount', { valueAsNumber: true })}
                />
              </div>
              {errors.total_amount && (
                <p className="text-xs text-destructive">{errors.total_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inst-count" className="text-xs">
                Quantidade de Parcelas *
              </Label>
              <Input
                id="inst-count"
                type="number"
                min="1"
                max="360"
                className="h-9 tabular"
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
              Valor estimado por parcela:
            </span>
            <span className="font-bold tabular text-foreground text-sm">
              {watchedInstallments || 0}x de {formatBRL(calculatedInstallmentAmount)}
            </span>
          </div>

          {/* Vínculo (Cartão ou Conta) */}
          {paymentMethod === 'card' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inst-card" className="text-xs">
                    Cartão de Crédito *
                  </Label>
                  {selectedCard && (
                    <span className="text-[11px] text-muted-foreground tabular">
                      Disponível:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {formatBRL(selectedCard.available_limit)}
                      </strong>
                    </span>
                  )}
                </div>
                <select
                  id="inst-card"
                  disabled={isSubmitting}
                  value={selectedCardId || ''}
                  onChange={(e) =>
                    setValue('card_id', e.target.value || null, { shouldValidate: true })
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 py-1.5 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" className="bg-popover text-popover-foreground">
                    Selecione o cartão
                  </option>
                  {activeCards.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-popover text-popover-foreground"
                    >
                      {c.name} ({c.institution || c.brand})
                    </option>
                  ))}
                </select>
                {errors.card_id && (
                  <p className="text-xs text-destructive">{errors.card_id.message}</p>
                )}
              </div>

              {/* Opção de Limite Já Contabilizado */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="inst-already-in-limit"
                      className="text-xs font-semibold leading-snug cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldCheck className="size-3.5 text-primary shrink-0" />
                      Este parcelamento já está contabilizado no limite utilizado do cartão?
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {alreadyIncludedInLimit
                        ? 'Ativado: o valor deste parcelamento não será descontado novamente do limite disponível do cartão.'
                        : 'Marque esta opção caso essa compra já esteja incluída no valor gasto informado ao cadastrar o cartão.'}
                    </p>
                  </div>
                  <Switch
                    id="inst-already-in-limit"
                    checked={Boolean(alreadyIncludedInLimit)}
                    onCheckedChange={(checked) =>
                      setValue('already_included_in_limit', checked, { shouldDirty: true })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="inst-account" className="text-xs">
                Conta de Débito (Opcional)
              </Label>
              <select
                id="inst-account"
                disabled={isSubmitting}
                {...register('account_id')}
                className="flex h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 py-1.5 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" className="bg-popover text-popover-foreground">
                  Nenhuma / Boleto externo
                </option>
                {activeAccounts.map((a) => (
                  <option
                    key={a.id}
                    value={a.id}
                    className="bg-popover text-popover-foreground"
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Categoria e Data da 1ª Parcela */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inst-category" className="text-xs">
                Categoria
              </Label>
              <select
                id="inst-category"
                disabled={isSubmitting}
                value={selectedCategoryId || ''}
                onChange={(e) => setValue('category_id', e.target.value || null)}
                className="flex h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 py-1.5 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" className="bg-popover text-popover-foreground">
                  Sem categoria
                </option>
                {expenseCategories.map((parent) => (
                  <optgroup
                    key={parent.id}
                    label={parent.name}
                    className="bg-popover text-popover-foreground"
                  >
                    <option
                      value={parent.id}
                      className="bg-popover text-popover-foreground"
                    >
                      {parent.name}
                    </option>
                    {(parent.children || []).map((sub) => (
                      <option
                        key={sub.id}
                        value={sub.id}
                        className="bg-popover text-popover-foreground"
                      >
                        ↳ {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inst-date" className="text-xs">
                Vencimento da 1ª Parcela *
              </Label>
              <Input
                id="inst-date"
                type="date"
                className="h-9"
                disabled={isSubmitting}
                {...register('start_date')}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
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
