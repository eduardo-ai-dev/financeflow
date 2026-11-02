import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { goalSchema, goalPriorities, type GoalFormData } from '@/lib/validations/goal'
import { useGoals, type GoalWithStats } from '@/hooks/use-goals'
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

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalToEdit?: GoalWithStats | null
  defaultStatus?: 'planned' | 'in_progress'
}

export function GoalDialog({
  open,
  onOpenChange,
  goalToEdit,
  defaultStatus = 'in_progress',
}: GoalDialogProps) {
  const { createGoal, updateGoal } = useGoals()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!goalToEdit

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      brand: '',
      priority: 'medium',
      target_amount: 0,
      current_amount: 0,
      target_date: null,
      status: defaultStatus,
      image_url: '',
      notes: '',
    },
  })

  const selectedPriority = useWatch({ control, name: 'priority', defaultValue: 'medium' })
  const selectedStatus = useWatch({ control, name: 'status', defaultValue: defaultStatus })

  useEffect(() => {
    if (goalToEdit) {
      reset({
        name: goalToEdit.name,
        brand: goalToEdit.brand || '',
        priority: goalToEdit.priority,
        target_amount: goalToEdit.target_amount,
        current_amount: goalToEdit.current_amount,
        target_date: goalToEdit.target_date || null,
        status: goalToEdit.status,
        image_url: goalToEdit.image_url || '',
        notes: goalToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        brand: '',
        priority: 'medium',
        target_amount: 0,
        current_amount: 0,
        target_date: null,
        status: defaultStatus,
        image_url: '',
        notes: '',
      })
    }
  }, [goalToEdit, reset, defaultStatus, open])

  function handleDialogChange(isOpen: boolean) {
    if (!isOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: GoalFormData) {
    try {
      setServerError(null)
      if (isEditing && goalToEdit) {
        await updateGoal({ id: goalToEdit.id, data })
      } else {
        await createGoal(data)
      }
      handleDialogChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar meta.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Meta / Item da Wishlist' : 'Nova Meta / Desejo de Compra'}
          </DialogTitle>
          <DialogDescription>
            Defina o objetivo, valor alvo, prioridade e acompanhe o progresso de acumulação até a compra.
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
            <Label htmlFor="goal-name">Nome do Objetivo ou Item *</Label>
            <Input
              id="goal-name"
              placeholder="Ex: Reserva de Emergência, MacBook Pro M3, Viagem Japão"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="goal-brand">Marca / Fornecedor (Opcional)</Label>
              <Input
                id="goal-brand"
                placeholder="Ex: Apple, Sony, Dell, CVC"
                {...register('brand')}
              />
            </div>
            <div>
              <Label htmlFor="goal-target-date">Data Alvo Prevista</Label>
              <Input
                id="goal-target-date"
                type="date"
                {...register('target_date')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_amount">Valor Alvo (R$) *</Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('target_amount', { valueAsNumber: true })}
              />
              {errors.target_amount && (
                <p className="mt-1 text-xs text-destructive">{errors.target_amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="current_amount">Valor Já Guardado (R$)</Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('current_amount', { valueAsNumber: true })}
              />
              {errors.current_amount && (
                <p className="mt-1 text-xs text-destructive">{errors.current_amount.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Prioridade</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {goalPriorities.map((p) => {
                const isSelected = selectedPriority === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setValue('priority', p.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {[
                { value: 'planned', label: 'Wishlist (Planejado)' },
                { value: 'in_progress', label: 'Em Poupança' },
                { value: 'completed', label: 'Concluído' },
                { value: 'canceled', label: 'Cancelado' },
              ].map((s) => {
                const isSelected = selectedStatus === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setValue('status', s.value as GoalFormData['status'])}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="goal-image">Link da Imagem ou URL do Produto</Label>
            <Input
              id="goal-image"
              placeholder="https://..."
              {...register('image_url')}
            />
          </div>

          <div>
            <Label htmlFor="goal-notes">Observações / Links</Label>
            <Input
              id="goal-notes"
              placeholder="Especificações, cupons, lojas consultadas..."
              {...register('notes')}
            />
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
                'Criar Meta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

