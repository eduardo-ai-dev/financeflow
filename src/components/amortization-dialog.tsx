import { useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  realEstateAmortizationSchema,
  type RealEstateAmortizationFormData,
} from '@/lib/validations/amortization'
import { useProperties, type PropertyWithCalculations } from '@/hooks/use-properties'
import { simulateAmortization } from '@/lib/mortgage'
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
import { AlertCircle, Loader2, Sparkles, TrendingDown, Clock } from 'lucide-react'

interface AmortizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: PropertyWithCalculations
}

export function AmortizationDialog({
  open,
  onOpenChange,
  property,
}: AmortizationDialogProps) {
  const { addAmortization } = useProperties()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RealEstateAmortizationFormData>({
    resolver: zodResolver(realEstateAmortizationSchema),
    defaultValues: {
      property_id: property.id,
      amount: 5000,
      date: getTodayDateString(),
      reduction_type: 'term',
      notes: '',
    },
  })

  const watchedAmount = useWatch({ control, name: 'amount', defaultValue: 5000 })
  const watchedReductionType = useWatch({ control, name: 'reduction_type', defaultValue: 'term' })

  // Simulação dinâmica em tempo real do impacto da amortização
  const simulation = useMemo(() => {
    if (!watchedAmount || watchedAmount <= 0) return null
    return simulateAmortization(
      property.outstanding_balance,
      property.annual_interest_rate,
      property.remaining_months,
      watchedAmount,
      watchedReductionType,
      property.amortization_system
    )
  }, [
    property.outstanding_balance,
    property.annual_interest_rate,
    property.remaining_months,
    property.amortization_system,
    watchedAmount,
    watchedReductionType,
  ])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: RealEstateAmortizationFormData) {
    setServerError(null)
    try {
      await addAmortization({
        data,
        property,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar amortização'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Amortização Extraordinária</DialogTitle>
          <DialogDescription>
            Amortize saldo devedor diretamente no financiamento de {property.name}.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Valor a Amortizar */}
          <div className="space-y-1.5">
            <Label htmlFor="amort-amount">Valor do Aporte Extraordinário (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="amort-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={property.outstanding_balance}
                placeholder="5000,00"
                className="pl-10 font-bold tabular text-lg"
                disabled={isSubmitting}
                {...register('amount', { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Saldo devedor atual: {formatBRL(property.outstanding_balance)}
            </p>
          </div>

          {/* Modalidade de Amortização (Prazo vs Parcela) */}
          <div className="space-y-1.5">
            <Label>Estratégia de Redução</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={watchedReductionType === 'term' ? 'default' : 'outline'}
                disabled={isSubmitting}
                className="text-xs"
                onClick={() => setValue('reduction_type', 'term')}
              >
                <Clock className="size-4 mr-1.5" />
                Reduzir Prazo (Meses)
              </Button>
              <Button
                type="button"
                variant={watchedReductionType === 'installment' ? 'default' : 'outline'}
                disabled={isSubmitting}
                className="text-xs"
                onClick={() => setValue('reduction_type', 'installment')}
              >
                <TrendingDown className="size-4 mr-1.5" />
                Reduzir Parcela (R$)
              </Button>
            </div>
          </div>

          {/* Banner de Impacto da Simulação em Tempo Real */}
          {simulation && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="size-4" />
                <span>Simulação do Impacto Financeiro</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground">Economia Total de Juros:</span>
                  <div className="tabular text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(simulation.interestSaved)}
                  </div>
                </div>

                <div>
                  {watchedReductionType === 'term' ? (
                    <>
                      <span className="text-muted-foreground">Prazo Eliminado:</span>
                      <div className="tabular text-lg font-extrabold text-foreground">
                        {simulation.monthsSaved} meses ({Math.floor(simulation.monthsSaved / 12)}a{' '}
                        {simulation.monthsSaved % 12}m)
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Nova Parcela:</span>
                      <div className="tabular text-lg font-extrabold text-foreground">
                        {formatBRL(simulation.newInstallment)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-primary/10">
                {watchedReductionType === 'term'
                  ? 'Reduzir prazo corta diretamente parcelas finais ricas em juros, maximizando sua economia.'
                  : 'Reduzir parcela alivia seu fluxo de caixa mensal imediato mantendo o prazo contratual.'}
              </p>
            </div>
          )}

          {/* Data e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amort-date">Data do Aporte *</Label>
              <Input
                id="amort-date"
                type="date"
                disabled={isSubmitting}
                {...register('date')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amort-notes">Origem do Recurso (Opcional)</Label>
              <Input
                id="amort-notes"
                placeholder="Ex.: FGTS, Bônus da empresa..."
                disabled={isSubmitting}
                {...register('notes')}
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
              Confirmar Amortização
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

