import { useState } from 'react'
import { useGoals, type GoalWithStats } from '@/hooks/use-goals'
import { formatBRL } from '@/lib/money'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, PiggyBank } from 'lucide-react'

interface GoalContributeDialogProps {
  goal: GoalWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalContributeDialog({ goal, open, onOpenChange }: GoalContributeDialogProps) {
  const { addContribution, isContributing } = useGoals()
  const [amount, setAmount] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (!goal) return null

  const activeGoal = goal
  const parsedAmount = parseFloat(amount)
  const previewAdded = !Number.isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0
  const previewTotal = activeGoal.current_amount + previewAdded
  const previewPercent =
    activeGoal.target_amount > 0
      ? Math.min(100, Math.round((previewTotal / activeGoal.target_amount) * 100))
      : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Informe um valor de aporte maior que zero.')
      return
    }

    try {
      setError(null)
      await addContribution({ id: activeGoal.id, amount: numericAmount })
      setAmount('')
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar aporte.'
      setError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Novo Aporte na Meta</DialogTitle>
              <DialogDescription className="truncate">{activeGoal.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/25 p-3.5 text-xs space-y-2.5 tabular">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Acumulado:</span>
            <span className="font-semibold text-foreground">
              {formatBRL(previewTotal)} de {formatBRL(activeGoal.target_amount)} ({previewPercent}%)
            </span>
          </div>
          <Progress
            value={previewPercent}
            indicatorClassName={previewPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'}
          />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Restante para concluir:</span>
            <span className="font-semibold text-primary">
              {formatBRL(Math.max(0, activeGoal.target_amount - previewTotal))}
            </span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contribute-amount">Valor do Aporte *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="contribute-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            {activeGoal.remaining_amount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[100, 250, 500]
                  .filter((v) => v < activeGoal.remaining_amount)
                  .map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className="rounded-md border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer tabular"
                    >
                      + {formatBRL(preset)}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setAmount(String(activeGoal.remaining_amount))}
                  className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors cursor-pointer tabular"
                >
                  Completar ({formatBRL(activeGoal.remaining_amount)})
                </button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isContributing}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isContributing}>
              {isContributing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Aportando...
                </>
              ) : (
                'Confirmar Aporte'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
