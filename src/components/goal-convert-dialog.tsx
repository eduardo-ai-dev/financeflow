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
    if (isNaN(numericPrice) || numericPrice <= 0) {
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
        notes: `Meta concluída: ${activeGoal.name}. Fabricante/Marca: ${activeGoal.brand || 'N/A'}`,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao converter meta em patrimônio.'
      setError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Comprar e Incorporar ao Patrimônio</DialogTitle>
              <DialogDescription>
                Conclua sua meta e transfira o item automaticamente para o seu Balanço Patrimonial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="convert-asset-name">Nome do Bem Patrimonial *</Label>
            <Input
              id="convert-asset-name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Ex: MacBook Pro M3 Max"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="convert-final-price">Preço Pago (R$) *</Label>
              <Input
                id="convert-final-price"
                type="number"
                step="0.01"
                className="tabular"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="convert-purchase-date">Data da Compra *</Label>
              <Input
                id="convert-purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="convert-asset-type">Classificação Patrimonial</Label>
            <select
              id="convert-asset-type"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
            >
              {assetTypes.map((t) => (
                <option key={t.value} value={t.value} className="bg-popover text-popover-foreground">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border p-3.5 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="register-expense-toggle" className="font-medium cursor-pointer">
                  Lançar saída no fluxo de caixa?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Registra automaticamente a despesa na sua conta bancária
                </p>
              </div>
              <input
                id="register-expense-toggle"
                type="checkbox"
                checked={registerExpense}
                onChange={(e) => setRegisterExpense(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
              />
            </div>

            {registerExpense && (
              <div>
                <Label htmlFor="convert-account">Conta de Pagamento</Label>
                <select
                  id="convert-account"
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="" className="bg-popover text-popover-foreground">
                    Selecione a conta de saída...
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-popover text-popover-foreground">
                      {acc.name} ({acc.institution || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Efetivar Compra e Criar Ativo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
