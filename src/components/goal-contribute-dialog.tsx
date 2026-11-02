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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Aportar na Meta</DialogTitle>
              <DialogDescription className="truncate max-w-[300px]">
                {activeGoal.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progresso Atual:</span>
            <span className="font-medium text-foreground">
              {formatBRL(activeGoal.current_amount)} de {formatBRL(activeGoal.target_amount)} ({activeGoal.progress_percent}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Falta para Concluir:</span>
            <span className="font-semibold text-primary">{formatBRL(activeGoal.remaining_amount)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contribute-amount">Valor do Aporte (R$) *</Label>
            <Input
              id="contribute-amount"
              type="number"
              step="0.01"
              placeholder="Ex: 250,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isContributing}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isContributing} className="bg-emerald-600 hover:bg-emerald-700">
              {isContributing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
