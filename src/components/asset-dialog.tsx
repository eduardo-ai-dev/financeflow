import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assetSchema, assetTypes, type AssetFormData } from '@/lib/validations/asset'
import { useAssets, type Asset } from '@/hooks/use-assets'
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
import { AlertCircle, Loader2 } from 'lucide-react'

interface AssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetToEdit?: Asset | null
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AssetDialog({ open, onOpenChange, assetToEdit }: AssetDialogProps) {
  const { createAsset, updateAsset } = useAssets()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!assetToEdit
  const [todayStr] = useState(() => getTodayString())

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      type: 'electronics',
      acquisition_value: 0,
      current_value: 0,
      acquisition_date: todayStr,
      notes: '',
    },
  })

  const selectedType = useWatch({ control, name: 'type', defaultValue: 'electronics' })

  useEffect(() => {
    if (assetToEdit) {
      reset({
        name: assetToEdit.name,
        type: assetToEdit.type,
        acquisition_value: assetToEdit.acquisition_value,
        current_value: assetToEdit.current_value,
        acquisition_date: assetToEdit.acquisition_date,
        goal_id: assetToEdit.goal_id,
        property_id: assetToEdit.property_id,
        notes: assetToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        type: 'electronics',
        acquisition_value: 0,
        current_value: 0,
        acquisition_date: todayStr,
        notes: '',
      })
    }
  }, [assetToEdit, reset, todayStr, open])

  function handleDialogChange(isOpen: boolean) {
    if (!isOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: AssetFormData) {
    try {
      setServerError(null)
      if (isEditing && assetToEdit) {
        await updateAsset({ id: assetToEdit.id, data })
      } else {
        await createAsset(data)
      }
      handleDialogChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar bem patrimonial.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Ativo Patrimonial' : 'Novo Ativo Patrimonial'}</DialogTitle>
          <DialogDescription>
            Registre bens e ativos físicos ou financeiros para compor o seu Balanço Patrimonial real.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="asset-name">Nome do Bem / Ativo *</Label>
            <Input id="asset-name" placeholder="Ex: Honda Civic 2022, MacBook M3 Max" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="asset-type-select">Tipo de Ativo</Label>
            <select
              id="asset-type-select"
              value={selectedType}
              onChange={(e) => setValue('type', e.target.value as AssetFormData['type'])}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {assetTypes.map((t) => (
                <option key={t.value} value={t.value} className="bg-popover text-popover-foreground">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset-acq-value">Valor Pago / Aquisição (R$) *</Label>
              <Input
                id="asset-acq-value"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('acquisition_value', { valueAsNumber: true })}
              />
              {errors.acquisition_value && (
                <p className="mt-1 text-xs text-destructive">{errors.acquisition_value.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="asset-cur-value">Valor Atual Estimado (R$) *</Label>
              <Input
                id="asset-cur-value"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('current_value', { valueAsNumber: true })}
              />
              {errors.current_value && (
                <p className="mt-1 text-xs text-destructive">{errors.current_value.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="asset-acq-date">Data de Aquisição *</Label>
            <Input id="asset-acq-date" type="date" {...register('acquisition_date')} />
            {errors.acquisition_date && (
              <p className="mt-1 text-xs text-destructive">{errors.acquisition_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="asset-notes">Observações</Label>
            <Input id="asset-notes" placeholder="Número de série, apólice, garantia..." {...register('notes')} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Ativo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

