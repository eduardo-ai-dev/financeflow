import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  creditCardSchema,
  cardBrands,
  cardColors,
  type CreditCardFormData,
} from '@/lib/validations/card'
import { useCards, type CreditCardWithLimit } from '@/hooks/use-cards'
import { useAccounts } from '@/hooks/use-accounts'
import { formatBRL, fromCents, toCents } from '@/lib/money'
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
import { AlertCircle, Info, Loader2 } from 'lucide-react'

interface CardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardToEdit?: CreditCardWithLimit | null
}

export function CardDialog({
  open,
  onOpenChange,
  cardToEdit,
}: CardDialogProps) {
  const { createCard, updateCard } = useCards()
  const { accounts } = useAccounts()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!cardToEdit

  const activeAccounts = accounts.filter((a) => !a.is_archived)
  const firstActiveAccountId = activeAccounts[0]?.id ?? null

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      name: '',
      institution: '',
      brand: 'mastercard',
      limit_amount: 1000,
      initial_used_amount: 0,
      closing_day: 1,
      due_day: 10,
      color: '#4f46e5',
      default_account_id: null,
    },
  })

  const selectedColor = useWatch({ control, name: 'color', defaultValue: '#4f46e5' })
  const selectedBrand = useWatch({ control, name: 'brand', defaultValue: 'mastercard' })
  const selectedAccountId = useWatch({ control, name: 'default_account_id' })
  const limitValue = useWatch({ control, name: 'limit_amount' })
  const usedValue = useWatch({ control, name: 'initial_used_amount' })

  // Compras já lançadas no app (faturas em aberto) são somadas automaticamente ao gasto informado.
  const registeredUsedCents = cardToEdit
    ? Math.max(
        0,
        toCents(cardToEdit.used_amount) - toCents(cardToEdit.initial_used_amount ?? 0)
      )
    : 0

  const limitCents = Number.isFinite(limitValue) ? toCents(limitValue) : 0
  const hasUsedValue = Number.isFinite(usedValue)
  const totalUsedCents = hasUsedValue ? toCents(usedValue) + registeredUsedCents : 0
  const availableCents = limitCents - totalUsedCents
  const usagePercent =
    limitCents > 0 ? Math.min(100, Math.max(0, Math.round((totalUsedCents / limitCents) * 100))) : 0

  useEffect(() => {
    if (cardToEdit) {
      reset({
        name: cardToEdit.name,
        institution: cardToEdit.institution || '',
        brand: cardToEdit.brand,
        limit_amount: Number(cardToEdit.limit_amount),
        initial_used_amount: Number(cardToEdit.initial_used_amount ?? 0),
        closing_day: cardToEdit.closing_day,
        due_day: cardToEdit.due_day,
        color: cardToEdit.color || '#4f46e5',
        default_account_id: cardToEdit.default_account_id,
      })
    } else {
      reset({
        name: '',
        institution: '',
        brand: 'mastercard',
        limit_amount: 1000,
        initial_used_amount: 0,
        closing_day: 1,
        due_day: 10,
        color: '#4f46e5',
        default_account_id: firstActiveAccountId,
      })
    }
  }, [cardToEdit, reset, open, firstActiveAccountId])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  // Digitar o disponível recalcula o gasto: gasto = limite - compras lançadas - disponível
  function handleAvailableChange(raw: string) {
    if (raw === '') {
      setValue('initial_used_amount', Number.NaN, { shouldDirty: true })
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    const usedCents = limitCents - registeredUsedCents - toCents(parsed)
    setValue('initial_used_amount', fromCents(usedCents), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  async function onSubmit(data: CreditCardFormData) {
    setServerError(null)
    try {
      if (isEditing && cardToEdit) {
        await updateCard({
          id: cardToEdit.id,
          data,
        })
      } else {
        await createCard(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cartão'
      if (msg.includes('credit_cards_user_name_key')) {
        setServerError('Você já possui um cartão cadastrado com este nome.')
      } else {
        setServerError('Não foi possível salvar os dados do cartão. Verifique as informações e tente novamente.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere limite, gasto, datas de fechamento ou configurações do cartão.'
              : 'Cadastre quantos cartões quiser, informando o limite e quanto já foi gasto.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Nome do Cartão */}
          <div className="space-y-1.5">
            <Label htmlFor="card-name">Nome / Apelido do Cartão *</Label>
            <Input
              id="card-name"
              placeholder="Ex.: Nubank Ultravioleta, Itaú Black, Inter"
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Instituição e Bandeira */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-institution">Instituição / Banco</Label>
              <Input
                id="card-institution"
                placeholder="Ex.: Nubank, Itaú..."
                disabled={isSubmitting}
                {...register('institution')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-brand">Bandeira *</Label>
              <select
                id="card-brand"
                disabled={isSubmitting}
                value={selectedBrand}
                onChange={(e) => setValue('brand', e.target.value as CreditCardFormData['brand'])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cardBrands.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Limite Total (R$) */}
          <div className="space-y-1.5">
            <Label htmlFor="card-limit">Limite Total de Crédito (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="card-limit"
                type="number"
                step="0.01"
                min="1"
                placeholder="0,00"
                className="pl-10 font-bold tabular"
                disabled={isSubmitting}
                {...register('limit_amount', { valueAsNumber: true })}
              />
            </div>
            {errors.limit_amount && (
              <p className="text-xs text-destructive">{errors.limit_amount.message}</p>
            )}
          </div>

          {/* Gasto e Disponível (campos ligados entre si) */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="card-used">Quanto já gastou (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="card-used"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-10 tabular"
                    disabled={isSubmitting}
                    {...register('initial_used_amount', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="card-available">Quanto tem disponível (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="card-available"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-10 tabular"
                    disabled={isSubmitting}
                    value={hasUsedValue ? fromCents(availableCents) : ''}
                    onChange={(e) => handleAvailableChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {errors.initial_used_amount && (
              <p className="text-xs text-destructive">{errors.initial_used_amount.message}</p>
            )}

            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    usagePercent >= 90
                      ? 'bg-rose-500'
                      : usagePercent >= 70
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {usagePercent}% do limite em uso
                {availableCents < 0 && ' — gasto acima do limite'}
              </p>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3 shrink-0" />
              <span>
                Preencha um dos dois: o outro é calculado automaticamente. Esse valor consome o
                limite, mas não vira despesa no fluxo de caixa.
                {registeredUsedCents > 0 &&
                  ` Já existem ${formatBRL(fromCents(registeredUsedCents))} em compras lançadas no app, somadas automaticamente.`}
              </span>
            </p>
          </div>

          {/* Dias de Fechamento e Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-closing">Dia do Fechamento *</Label>
              <Input
                id="card-closing"
                type="number"
                min="1"
                max="31"
                disabled={isSubmitting}
                {...register('closing_day', { valueAsNumber: true })}
              />
              {errors.closing_day && (
                <p className="text-xs text-destructive">{errors.closing_day.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-due">Dia do Vencimento *</Label>
              <Input
                id="card-due"
                type="number"
                min="1"
                max="31"
                disabled={isSubmitting}
                {...register('due_day', { valueAsNumber: true })}
              />
              {errors.due_day && (
                <p className="text-xs text-destructive">{errors.due_day.message}</p>
              )}
            </div>
          </div>

          {/* Conta de Débito Padrão */}
          <div className="space-y-1.5">
            <Label htmlFor="card-account">Conta Bancária Padrão para Pagamento</Label>
            <select
              id="card-account"
              disabled={isSubmitting}
              value={selectedAccountId || ''}
              onChange={(e) => setValue('default_account_id', e.target.value || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione quando for pagar</option>
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cor de Destaque */}
          <div className="space-y-1.5">
            <Label>Cor do Cartão</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {cardColors.map((color) => {
                const isSelected = selectedColor.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setValue('color', color)}
                    style={{ backgroundColor: color }}
                    className={`size-6 rounded-full transition-transform hover:scale-110 focus:outline-hidden ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                    }`}
                    aria-label={`Selecionar cor ${color}`}
                  />
                )
              })}
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
              {isEditing ? 'Salvar Alterações' : 'Criar Cartão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
