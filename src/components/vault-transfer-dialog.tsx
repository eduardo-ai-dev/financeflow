import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vaultTransferSchema, type VaultTransferFormData } from '@/lib/validations/vault'
import { useVaults, type VaultItem } from '@/hooks/use-vaults'
import { useAccounts } from '@/hooks/use-accounts'
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
import {
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'

interface VaultTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialVault?: VaultItem | null
  initialMode?: 'deposit' | 'withdraw'
}

export function VaultTransferDialog({
  open,
  onOpenChange,
  initialVault,
  initialMode = 'deposit',
}: VaultTransferDialogProps) {
  const { activeVaults, depositToVault, withdrawFromVault } = useVaults()
  const { accounts } = useAccounts()

  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode)
  const [serverError, setServerError] = useState<string | null>(null)

  const operationalAccounts = useMemo(
    () => accounts.filter((a) => !a.is_archived && a.type !== 'vault'),
    [accounts]
  )

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VaultTransferFormData>({
    resolver: zodResolver(vaultTransferSchema),
    defaultValues: {
      vault_id: initialVault?.id || activeVaults[0]?.id || '',
      account_id: operationalAccounts[0]?.id || '',
      amount: 0,
      date: getTodayDateString(),
      notes: '',
    },
  })

  const selectedVaultId = watch('vault_id')
  const inputAmount = watch('amount') || 0

  const selectedVault = useMemo(
    () => activeVaults.find((v) => v.id === selectedVaultId),
    [activeVaults, selectedVaultId]
  )

  useEffect(() => {
    if (!open) return
    setServerError(null)
    setMode(initialMode)
    reset({
      vault_id: initialVault?.id || activeVaults[0]?.id || '',
      account_id: operationalAccounts[0]?.id || '',
      amount: 0,
      date: getTodayDateString(),
      notes: '',
    })
  }, [open, initialVault, initialMode, activeVaults, operationalAccounts, reset])

  // Cálculo de projeção de saldo
  const projectedVaultBalance = useMemo(() => {
    if (!selectedVault) return 0
    const current = selectedVault.current_balance
    return mode === 'deposit' ? current + inputAmount : Math.max(0, current - inputAmount)
  }, [selectedVault, inputAmount, mode])

  async function onSubmit(data: VaultTransferFormData) {
    setServerError(null)
    if (!selectedVault) {
      setServerError('Selecione um cofre válido.')
      return
    }

    if (mode === 'withdraw' && data.amount > selectedVault.current_balance) {
      setServerError(
        `Saldo insuficiente no cofre (${formatBRL(selectedVault.current_balance)}) para realizar este resgate.`
      )
      return
    }

    try {
      if (mode === 'deposit') {
        await depositToVault({
          vault_id: data.vault_id,
          vault_name: selectedVault.name,
          account_id: data.account_id,
          amount: data.amount,
          date: data.date,
          notes: data.notes,
        })
      } else {
        await withdrawFromVault({
          vault_id: data.vault_id,
          vault_name: selectedVault.name,
          account_id: data.account_id,
          amount: data.amount,
          date: data.date,
          notes: data.notes,
        })
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar movimentação.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            {mode === 'deposit' ? 'Guardar Dinheiro no Cofre' : 'Resgatar Dinheiro do Cofre'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'deposit'
              ? 'Transfira recursos da sua conta corrente para blindar no cofre.'
              : 'Resgate fundos do cofre de volta para sua conta bancária operacional.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Alternador de Modo: Depositar vs Resgatar */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 border">
            <button
              type="button"
              onClick={() => setMode('deposit')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'deposit'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownLeft className="size-3.5" />
              Guardar no Cofre
            </button>
            <button
              type="button"
              onClick={() => setMode('withdraw')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'withdraw'
                  ? 'bg-background text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="size-3.5" />
              Resgatar para Conta
            </button>
          </div>

          {/* Seleção do Cofre */}
          <div className="space-y-1.5">
            <Label htmlFor="t-vault">Cofre de Reserva *</Label>
            <select
              id="t-vault"
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              {...register('vault_id')}
            >
              {activeVaults.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (Saldo: {formatBRL(v.current_balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Seleção da Conta Corrente */}
          <div className="space-y-1.5">
            <Label htmlFor="t-account">
              {mode === 'deposit' ? 'Conta de Origem (Débito) *' : 'Conta de Destino (Crédito) *'}
            </Label>
            <select
              id="t-account"
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              {...register('account_id')}
            >
              {operationalAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.institution || 'Banco'})
                </option>
              ))}
            </select>
            {errors.account_id && (
              <p className="text-xs text-destructive">{errors.account_id.message}</p>
            )}
          </div>

          {/* Valor (R$) e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-amount">Valor (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="t-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="pl-9 text-sm font-bold tabular"
                  disabled={isSubmitting}
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-date">Data da Transferência *</Label>
              <Input id="t-date" type="date" disabled={isSubmitting} {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          {/* Prévia do Saldo do Cofre */}
          {selectedVault && inputAmount > 0 && (
            <div className="rounded-xl border bg-muted/20 p-3 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Saldo atual no cofre:</span>
                <span className="font-semibold text-foreground">
                  {formatBRL(selectedVault.current_balance)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-border/50">
                <span>Saldo após movimentação:</span>
                <span
                  className={
                    mode === 'deposit'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }
                >
                  {formatBRL(projectedVaultBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Observações (Opcional)</Label>
            <Input
              id="t-notes"
              placeholder="Ex.: Aporte mensal, rendimentos aplicados..."
              disabled={isSubmitting}
              {...register('notes')}
            />
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
              {mode === 'deposit' ? 'Confirmar Aporte' : 'Confirmar Resgate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
