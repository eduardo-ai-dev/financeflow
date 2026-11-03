import { useState } from 'react'
import { formatBRL } from '@/lib/money'
import { useLiabilities } from '@/hooks/use-liabilities'
import type { Liability } from '@/types/database'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Sparkles, TrendingDown } from 'lucide-react'

interface DebtAmortizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liability: Liability | null
}

export function DebtAmortizationDialog({
  open,
  onOpenChange,
  liability,
}: DebtAmortizationDialogProps) {
  const { updateLiability } = useLiabilities()
  const [amortizationAmount, setAmortizationAmount] = useState<number>(0)
  const reduceInstallments = true
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!liability) return null

  const currentBalance = Number(liability.current_balance)
  const remainingInstallments = Number(liability.remaining_installments) || 0
  const monthlyPayment = Number(liability.monthly_payment) || 0

  const projectedBalance = Math.max(0, currentBalance - amortizationAmount)
  const isFullyPaid = projectedBalance === 0

  // Estimativa de parcelas restantes reduzidas
  const projectedInstallments =
    reduceInstallments && monthlyPayment > 0
      ? Math.ceil(projectedBalance / monthlyPayment)
      : remainingInstallments

  const installmentsSaved = Math.max(0, remainingInstallments - projectedInstallments)

  async function handleConfirm() {
    if (!liability) return
    if (amortizationAmount <= 0) {
      setServerError('Informe um valor de amortização maior que zero.')
      return
    }

    if (amortizationAmount > currentBalance) {
      setServerError('O valor da amortização não pode ser maior que o saldo devedor atual.')
      return
    }

    setServerError(null)
    setIsSubmitting(true)

    try {
      await updateLiability({
        id: liability.id,
        data: {
          current_balance: projectedBalance,
          remaining_installments: reduceInstallments ? projectedInstallments : remainingInstallments,
        },
      })

      setAmortizationAmount(0)
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao amortizar passivo'
      setServerError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="size-5 text-emerald-500" />
            Amortizar Dívida / Financiamento
          </DialogTitle>
          <DialogDescription>
            Abata um valor extraordinário do saldo devedor de <strong>{liability.name}</strong> para reduzir o tempo ou o montante de juros.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-2">
          {/* Card com situação atual */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Saldo Devedor Atual:</span>
              <span className="font-bold text-foreground tabular">{formatBRL(currentBalance)}</span>
            </div>
            {remainingInstallments > 0 && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Parcelas Restantes:</span>
                <span className="font-semibold text-foreground tabular">{remainingInstallments} parcelas</span>
              </div>
            )}
            {monthlyPayment > 0 && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Parcela Mensal Atual:</span>
                <span className="font-semibold text-foreground tabular">{formatBRL(monthlyPayment)}</span>
              </div>
            )}
          </div>

          {/* Campo de valor da amortização */}
          <div className="space-y-1.5">
            <Label htmlFor="amort-val">Valor do Aporte Extra (R$) *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="amort-val"
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalance}
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
                value={amortizationAmount || ''}
                onChange={(e) => setAmortizationAmount(Number(e.target.value) || 0)}
              />
            </div>
            {/* Atalhos rápidos de % */}
            <div className="flex items-center gap-1.5 pt-1">
              {[0.1, 0.25, 0.5, 1.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAmortizationAmount(Math.round(currentBalance * pct * 100) / 100)}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {pct === 1.0 ? 'Quitar 100%' : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Projeção do impacto */}
          {amortizationAmount > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-4" />
                Impacto da Amortização
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Novo Saldo Devedor:</span>
                <span className="font-bold text-foreground tabular">
                  {isFullyPaid ? 'QUITADO! 🎉' : formatBRL(projectedBalance)}
                </span>
              </div>
              {installmentsSaved > 0 && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Redução no Prazo:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">
                    -{installmentsSaved} parcelas a pagar
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || amortizationAmount <= 0}
            onClick={handleConfirm}
          >
            {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Confirmar Amortização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
