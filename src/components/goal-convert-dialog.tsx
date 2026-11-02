import { useState } from 'react'
import { useGoals, type GoalWithStats } from '@/hooks/use-goals'
import { useAccounts } from '@/hooks/use-accounts'
import { assetTypes } from '@/lib/validations/asset'
import { getTodayDateString } from '@/lib/date'
import type { AssetType } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Sparkles, Building2 } from 'lucide-react'

interface GoalConvertDialogProps {
  goal: GoalWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalConvertDialog({ goal, open, onOpenChange }: GoalConvertDialogProps) {
  const { convertGoalToAsset, isConverting } = useGoals()
  const { accounts } = useAccounts()

  const [todayStr] = useState(() => getTodayDateString())
  const [assetName, setAssetName] = useState(goal?.name || '')
  const [finalPrice, setFinalPrice] = useState(goal ? String(goal.target_amount) : '')
  const [purchaseDate, setPurchaseDate] = useState(todayStr)
  const [assetType, setAssetType] = useState<AssetType>('electronics')
  const [accountId, setAccountId] = useState<string>('')
  const [registerExpense, setRegisterExpense] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (!goal) return null
  const activeGoal = goal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericPrice = parseFloat(finalPrice)
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError('Informe um valor final válido de compra.')
      return
    }

    if (!assetName.trim()) {
      setError('Informe o nome do bem a ser incorporado ao patrimônio.')
      return
    }

    try {
      setError(null)
      await convertGoalToAsset({
        goalId: activeGoal.id,
        assetName: assetName.trim(),
        finalPrice: numericPrice,
        purchaseDate,
        assetType,
        accountId: registerExpense && accountId ? accountId : null,
        categoryId: activeGoal.category_id || null,
        notes: `Meta concluída: ${activeGoal.name}${
          activeGoal.brand ? ` (${activeGoal.brand})` : ''
        }`,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao converter meta em patrimônio.'
      setError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <DialogTitle>Concluir Meta & Incorporar Bem</DialogTitle>
              <DialogDescription>
                Registre a aquisição e adicione o bem diretamente ao seu Balanço Patrimonial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="convert-asset-name">Nome do Bem Patrimonial *</Label>
            <Input
              id="convert-asset-name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Ex.: MacBook Pro M3 Max"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="convert-final-price">Preço Pago *</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="convert-final-price"
                  type="number"
                  step="0.01"
                  className="pl-9 font-semibold tabular"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convert-purchase-date">Data da Compra *</Label>
              <Input
                id="convert-purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="convert-asset-type">Classificação Patrimonial</Label>
            <select
              id="convert-asset-type"
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
            >
              {assetTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border p-3.5 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="register-expense-toggle" className="font-medium cursor-pointer">
                  Debitar compra de uma conta bancária?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Registra automaticamente a saída na conta selecionada
                </p>
              </div>
              <Switch
                id="register-expense-toggle"
                checked={registerExpense}
                onCheckedChange={setRegisterExpense}
              />
            </div>

            {registerExpense && (
              <div className="space-y-1.5 pt-1 border-t border-border/60">
                <Label htmlFor="convert-account">Conta de Pagamento</Label>
                <select
                  id="convert-account"
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">Selecione a conta de saída...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution || 'Principal'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConverting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isConverting} className="gap-2">
              {isConverting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Concluindo...
                </>
              ) : (
                <>
                  <Building2 className="size-4" />
                  Concluir e Criar Bem
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
