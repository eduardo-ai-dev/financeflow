import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { goalSchema, goalPriorities, type GoalFormData } from '@/lib/validations/goal'
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Loader2, Target, ShoppingBag } from 'lucide-react'

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalToEdit?: GoalWithStats | null
  defaultStatus?: 'planned' | 'in_progress'
}

const STATUS_OPTIONS: Array<{
  value: GoalFormData['status']
  label: string
}> = [
  { value: 'planned', label: 'Wishlist' },
  { value: 'in_progress', label: 'Em Poupança' },
  { value: 'completed', label: 'Concluída' },
  { value: 'canceled', label: 'Cancelada' },
]

export function GoalDialog({
  open,
  onOpenChange,
  goalToEdit,
  defaultStatus = 'in_progress',
}: GoalDialogProps) {
  const { createGoal, updateGoal } = useGoals()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!goalToEdit

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      brand: '',
      priority: 'medium',
      target_amount: undefined as unknown as number,
      current_amount: 0,
      target_date: '',
      status: defaultStatus,
      image_url: '',
      notes: '',
    },
  })

  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = form

  const watchedTarget = useWatch({ control, name: 'target_amount' })
  const watchedCurrent = useWatch({ control, name: 'current_amount' })
  const watchedStatus = useWatch({ control, name: 'status', defaultValue: defaultStatus })

  const safeTarget = Number.isFinite(watchedTarget) && watchedTarget > 0 ? watchedTarget : 0
  const safeCurrent = Number.isFinite(watchedCurrent) && watchedCurrent > 0 ? watchedCurrent : 0
  const previewPercent =
    safeTarget > 0 ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100)) : 0
  const previewRemaining = Math.max(0, safeTarget - safeCurrent)

  useEffect(() => {
    if (goalToEdit) {
      reset({
        name: goalToEdit.name,
        brand: goalToEdit.brand || '',
        priority: goalToEdit.priority,
        target_amount: goalToEdit.target_amount,
        current_amount: goalToEdit.current_amount,
        target_date: goalToEdit.target_date || '',
        status: goalToEdit.status,
        image_url: goalToEdit.image_url || '',
        notes: goalToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        brand: '',
        priority: 'medium',
        target_amount: undefined as unknown as number,
        current_amount: 0,
        target_date: '',
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {watchedStatus === 'planned' ? (
                <ShoppingBag className="size-5" />
              ) : (
                <Target className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isEditing
                  ? 'Editar Meta Financeira'
                  : watchedStatus === 'planned'
                  ? 'Novo Desejo na Wishlist'
                  : 'Nova Meta Financeira'}
              </DialogTitle>
              <DialogDescription>
                Defina o valor objetivo, prazo e prioridade para acompanhar sua evolução.
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
            {/* Nome do Objetivo */}
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Objetivo ou Bem *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: Reserva de Emergência, MacBook Pro, Viagem..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valores Monetários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField
                control={control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Alvo *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0,00"
                          className="pl-9 font-semibold tabular"
                          value={
                            field.value === undefined || Number.isNaN(field.value)
                              ? ''
                              : field.value
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            field.onChange(raw === '' ? Number.NaN : Number(raw))
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
                name="current_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Já Guardado</FormLabel>
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
            </div>

            {/* Prévia ao vivo do Progresso */}
            {safeTarget > 0 && (
              <div className="rounded-xl border bg-muted/25 px-3.5 py-3 space-y-2 tabular">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    Progresso inicial: <strong className="text-primary">{previewPercent}%</strong>
                  </span>
                  <span className="text-muted-foreground">
                    {previewRemaining > 0
                      ? `Faltam ${formatBRL(previewRemaining)}`
                      : 'Meta 100% alcançada'}
                  </span>
                </div>
                <Progress
                  value={previewPercent}
                  indicatorClassName={previewPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'}
                />
              </div>
            )}

            {/* Marca e Data Alvo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField
                control={control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca ou Instituição</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Apple, Tesouro Direto, CVC"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Prevista</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Prioridade e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {goalPriorities.map((p) => {
                        const isSelected = field.value === p.value
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => field.onChange(p.value)}
                            className={`h-9 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer truncate ${
                              isSelected
                                ? 'border-primary bg-primary/12 text-primary font-semibold ring-1 ring-primary/40'
                                : 'border-border bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            }`}
                          >
                            {p.label}
                          </button>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estágio da Meta</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_OPTIONS.map((s) => {
                        const isSelected = field.value === s.value
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => field.onChange(s.value)}
                            className={`h-9 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer truncate ${
                              isSelected
                                ? 'border-primary bg-primary/12 text-primary font-semibold ring-1 ring-primary/40'
                                : 'border-border bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            }`}
                          >
                            {s.label}
                          </button>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* URL da Imagem & Observações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1 border-t">
              <FormField
                control={control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto de Inspiração (URL opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Links, especificações ou anotações..."
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                ) : watchedStatus === 'planned' ? (
                  'Salvar na Wishlist'
                ) : (
                  'Criar Meta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
