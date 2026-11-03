import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  vaultSchema,
  VAULT_PURPOSES,
  type VaultFormData,
} from '@/lib/validations/vault'
import { useVaults, type VaultItem } from '@/hooks/use-vaults'
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
import { AlertCircle, Loader2, Vault } from 'lucide-react'

interface VaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaultToEdit?: VaultItem | null
}

const VAULT_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#64748b', // slate
]

export function VaultDialog({ open, onOpenChange, vaultToEdit }: VaultDialogProps) {
  const { createVault, updateVault } = useVaults()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!vaultToEdit

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VaultFormData>({
    resolver: zodResolver(vaultSchema),
    defaultValues: {
      name: '',
      institution: '',
      purpose: 'emergency',
      target_amount: 0,
      opening_balance: 0,
      color: '#10b981',
      yield_rate: '100% do CDI',
      liquidity: 'daily',
      notes: '',
    },
  })

  const selectedColor = watch('color')
  const selectedPurpose = watch('purpose')

  useEffect(() => {
    if (!open) return
    setServerError(null)

    if (vaultToEdit) {
      reset({
        name: vaultToEdit.name,
        institution: vaultToEdit.institution || '',
        purpose: vaultToEdit.purpose,
        target_amount: vaultToEdit.target_amount,
        opening_balance: vaultToEdit.current_balance,
        color: vaultToEdit.color,
        yield_rate: '100% do CDI',
        liquidity: 'daily',
        notes: vaultToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        institution: '',
        purpose: 'emergency',
        target_amount: 0,
        opening_balance: 0,
        color: '#10b981',
        yield_rate: '100% do CDI',
        liquidity: 'daily',
        notes: '',
      })
    }
  }, [open, vaultToEdit, reset])

  async function onSubmit(data: VaultFormData) {
    setServerError(null)
    try {
      if (isEditing && vaultToEdit) {
        await updateVault({
          id: vaultToEdit.id,
          data,
        })
      } else {
        await createVault(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cofre.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vault className="size-5 text-primary" />
            {isEditing ? 'Editar Cofre / Reserva' : 'Novo Cofre Blindado'}
          </DialogTitle>
          <DialogDescription>
            Separe reservas de emergência, oportunidade e alocações carimbadas da sua conta operacional.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Finalidade do Cofre */}
          <div className="space-y-1.5">
            <Label>Finalidade da Reserva *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VAULT_PURPOSES.map((p) => {
                const isActive = selectedPurpose === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setValue('purpose', p.value, { shouldDirty: true, shouldValidate: true })
                      if (!isEditing && p.color) {
                        setValue('color', p.color)
                      }
                    }}
                    className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-foreground">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{p.badge}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                      {p.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nome e Instituição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vault-name">Nome do Cofre *</Label>
              <Input
                id="vault-name"
                placeholder="Ex.: Reserva de Emergência, IPVA 2027..."
                disabled={isSubmitting}
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vault-inst">Instituição / Custodiante</Label>
              <Input
                id="vault-inst"
                placeholder="Ex.: Nubank Caixinha, Tesouro Selic..."
                disabled={isSubmitting}
                {...register('institution')}
              />
            </div>
          </div>

          {/* Meta de Valor e Saldo Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vault-target">Meta de Saldo (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="vault-target"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-9 text-sm font-semibold tabular"
                  disabled={isSubmitting}
                  {...register('target_amount', { valueAsNumber: true })}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Deixe 0 se o cofre não tiver um teto predeterminado.
              </p>
            </div>

            {!isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="vault-opening">Saldo Inicial (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="vault-opening"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-9 text-sm font-semibold tabular"
                    disabled={isSubmitting}
                    {...register('opening_balance', { valueAsNumber: true })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Valor já guardado neste cofre atualmente.
                </p>
              </div>
            )}
          </div>

          {/* Rendimento e Liquidez */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vault-yield">Rendimento Estimado</Label>
              <Input
                id="vault-yield"
                placeholder="Ex.: 100% do CDI, Selic + 0.1%..."
                disabled={isSubmitting}
                {...register('yield_rate')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vault-liquidity">Prazo de Resgate / Liquidez</Label>
              <select
                id="vault-liquidity"
                disabled={isSubmitting}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                {...register('liquidity')}
              >
                <option value="immediate">Imediata (24/7)</option>
                <option value="daily">Diária (D+0 dias úteis)</option>
                <option value="d_plus_1">D+1 dia útil</option>
                <option value="d_plus_30">D+30 dias</option>
                <option value="locked">No vencimento / Carência</option>
              </select>
            </div>
          </div>

          {/* Cor Temática */}
          <div className="space-y-1.5">
            <Label>Identificação Visual / Cor</Label>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {VAULT_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setValue('color', hex, { shouldDirty: true })}
                  className={`size-7 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedColor === hex ? 'scale-110 border-foreground shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="vault-notes">Regras / Observações (Opcional)</Label>
            <Input
              id="vault-notes"
              placeholder="Ex.: Resgatar apenas em caso de perda de renda ou imprevistos de saúde..."
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
              {isEditing ? 'Salvar Cofre' : 'Criar Cofre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

