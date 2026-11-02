import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { investmentTxSchema, type InvestmentTxFormData } from '@/lib/validations/investment'
import { useInvestments, type InvestmentWithStats } from '@/hooks/use-investments'
import { useAccounts } from '@/hooks/use-accounts'
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
import { AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft, Coins } from 'lucide-react'

interface InvestmentTxDialogProps {
  investment: InvestmentWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: 'contribution' | 'redemption' | 'dividend' | 'yield'
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function InvestmentTransactionDialog({
  investment,
  open,
  onOpenChange,
  defaultType = 'contribution',
}: InvestmentTxDialogProps) {
  const { addTransaction, isAddingTx } = useInvestments()
  const { accounts } = useAccounts()
  const [serverError, setServerError] = useState<string | null>(null)
  const [todayStr] = useState(() => getTodayString())

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<InvestmentTxFormData>({
    resolver: zodResolver(investmentTxSchema),
    defaultValues: {
      investment_id: investment?.id || '',
      type: defaultType,
      amount: 0,
      shares_quantity: null,
      unit_price: null,
      date: todayStr,
      account_id: null,
      notes: '',
    },
  })

  const selectedType = useWatch({ control, name: 'type', defaultValue: defaultType })

  if (!investment) return null

  function handleDialogChange(isOpen: boolean) {
    if (!isOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: InvestmentTxFormData) {
    try {
      setServerError(null)
      await addTransaction({
        ...data,
        investment_id: investment!.id,
      })
      handleDialogChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar movimentação.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {selectedType === 'contribution' ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : selectedType === 'redemption' ? (
                <ArrowDownLeft className="h-5 w-5" />
              ) : (
                <Coins className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle>Movimentação de Investimento</DialogTitle>
              <DialogDescription className="truncate max-w-[300px]">
                {investment.name} {investment.ticker ? `(${investment.ticker})` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Tipo de Movimentação</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[
                { value: 'contribution', label: 'Novo Aporte (Comprar)' },
                { value: 'redemption', label: 'Resgate (Vender)' },
                { value: 'dividend', label: 'Dividendos / JCP' },
                { value: 'yield', label: 'Rendimento / Juros' },
              ].map((opt) => {
                const isSelected = selectedType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('type', opt.value as InvestmentTxFormData['type'])}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="tx-amount">Valor Total (R$) *</Label>
            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-shares">Qtd. Cotas / Ações</Label>
              <Input
                id="tx-shares"
                type="number"
                step="0.0001"
                placeholder="Opcional"
                {...register('shares_quantity', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="tx-price">Preço Unitário (R$)</Label>
              <Input
                id="tx-price"
                type="number"
                step="0.01"
                placeholder="Opcional"
                {...register('unit_price', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tx-date">Data da Operação *</Label>
            <Input id="tx-date" type="date" {...register('date')} />
            {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date.message}</p>}
          </div>

          {(selectedType === 'contribution' || selectedType === 'redemption') && (
            <div className="rounded-md border p-3 bg-muted/30 space-y-1">
              <Label htmlFor="tx-account">
                {selectedType === 'contribution'
                  ? 'Debitar de qual conta bancária? (Opcional)'
                  : 'Creditar em qual conta bancária? (Opcional)'}
              </Label>
              <select
                id="tx-account"
                {...register('account_id')}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" className="bg-popover text-popover-foreground">
                  Não movimentar saldo bancário
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-popover text-popover-foreground">
                    {acc.name} ({acc.institution || 'Geral'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Conforme a Regra 4, essa movimentação ajusta o caixa livre sem gerar distorções de consumo no orçamento.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="tx-notes">Notas / Observações</Label>
            <Input id="tx-notes" placeholder="Número de nota, corretagem..." {...register('notes')} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isAddingTx}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isAddingTx}>
              {isAddingTx ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gravando...
                </>
              ) : (
                'Confirmar Movimentação'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
