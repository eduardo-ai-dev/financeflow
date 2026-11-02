import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assetSchema, assetTypes, type AssetFormData } from '@/lib/validations/asset'
import { useAssets, type Asset } from '@/hooks/use-assets'
import { getTodayDateString } from '@/lib/date'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Layers, Loader2 } from 'lucide-react'

interface AssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetToEdit?: Asset | null
}

export function AssetDialog({ open, onOpenChange, assetToEdit }: AssetDialogProps) {
  const { createAsset, updateAsset } = useAssets()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!assetToEdit
  const [todayStr] = useState(() => getTodayDateString())

  const form = useForm<AssetFormData>({
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

  const {
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { isSubmitting },
  } = form

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <DialogTitle>
                {isEditing ? 'Editar Ativo Patrimonial' : 'Novo Ativo Patrimonial'}
              </DialogTitle>
              <DialogDescription>
                Registre veículos, bens ou equipamentos para compor o seu Balanço Patrimonial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Bem ou Ativo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Honda Civic 2023, MacBook Pro M3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormItem>
                <FormLabel htmlFor="asset-type-select">Tipo de Ativo</FormLabel>
                <select
                  id="asset-type-select"
                  value={selectedType}
                  onChange={(e) => setValue('type', e.target.value as AssetFormData['type'])}
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {assetTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormItem>

              <FormField
                control={control}
                name="acquisition_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Aquisição *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField
                control={control}
                name="acquisition_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Aquisição *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          className="pl-9 tabular"
                          value={
                            field.value === undefined ||
                            Number.isNaN(field.value) ||
                            (!isEditing && field.value === 0)
                              ? ''
                              : field.value
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            field.onChange(raw === '' ? 0 : Number(raw))
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="current_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Atual Estimado *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          className="pl-9 font-semibold tabular"
                          value={
                            field.value === undefined ||
                            Number.isNaN(field.value) ||
                            (!isEditing && field.value === 0)
                              ? ''
                              : field.value
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            field.onChange(raw === '' ? 0 : Number(raw))
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Número de série, seguradora, garantia..."
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
                    <Loader2 className="mr-2 size-4 animate-spin" />
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
