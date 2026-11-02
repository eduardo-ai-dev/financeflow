import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { liabilitySchema, liabilityTypes, type LiabilityFormData } from '@/lib/validations/liability'
import { useLiabilities, type Liability } from '@/hooks/use-liabilities'
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

interface LiabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liabilityToEdit?: Liability | null
}

export function LiabilityDialog({ open, onOpenChange, liabilityToEdit }: LiabilityDialogProps) {
  const { createLiability, updateLiability } = useLiabilities()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!liabilityToEdit

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LiabilityFormData>({
    resolver: zodResolver(liabilitySchema),
    defaultValues: {
      name: '',
      type: 'loan',
      total_amount: 0,
      current_balance: 0,
      monthly_payment: null,
      remaining_installments: null,
      interest_rate_monthly: null,
      due_date: null,
      notes: '',
    },
  })

  const selectedType = useWatch({ control, name: 'type', defaultValue: 'loan' })

  useEffect(() => {
    if (liabilityToEdit) {
      reset({
        name: liabilityToEdit.name,
        type: liabilityToEdit.type,
        total_amount: liabilityToEdit.total_amount,
        current_balance: liabilityToEdit.current_balance,
        monthly_payment: liabilityToEdit.monthly_payment,
        remaining_installments: liabilityToEdit.remaining_installments,
        interest_rate_monthly: liabilityToEdit.interest_rate_monthly,
        due_date: liabilityToEdit.due_date,
        notes: liabilityToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        type: 'loan',
        total_amount: 0,
        current_balance: 0,
        monthly_payment: null,
        remaining_installments: null,
        interest_rate_monthly: null,
        due_date: null,
        notes: '',
      })
    }
  }, [liabilityToEdit, reset, open])

  function handleDialogChange(isOpen: boolean) {
    if (!isOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: LiabilityFormData) {
    try {
      setServerError(null)
      if (isEditing && liabilityToEdit) {
        await updateLiability({ id: liabilityToEdit.id, data })
      } else {
        await createLiability(data)
      }
      handleDialogChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar obrigação financeira.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Obrigação / Passivo' : 'Nova Obrigação / Dívida'}
          </DialogTitle>
          <DialogDescription>
            Registre empréstimos, financiamentos e passivos para abater do seu patrimônio bruto.
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
            <Label htmlFor="liab-name">Descrição do Passivo *</Label>
            <Input id="liab-name" placeholder="Ex: Empréstimo Caixa, Financiamento Moto" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="liab-type">Categoria do Passivo</Label>
            <select
              id="liab-type"
              value={selectedType}
              onChange={(e) => setValue('type', e.target.value as LiabilityFormData['type'])}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {liabilityTypes.map((t) => (
                <option key={t.value} value={t.value} className="bg-popover text-popover-foreground">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="liab-total">Valor Total Contratado (R$) *</Label>
              <Input
                id="liab-total"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('total_amount', { valueAsNumber: true })}
              />
              {errors.total_amount && (
                <p className="mt-1 text-xs text-destructive">{errors.total_amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="liab-balance">Saldo Devedor Atual (R$) *</Label>
              <Input
                id="liab-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('current_balance', { valueAsNumber: true })}
              />
              {errors.current_balance && (
                <p className="mt-1 text-xs text-destructive">{errors.current_balance.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="liab-monthly">Valor da Parcela (R$)</Label>
              <Input
                id="liab-monthly"
                type="number"
                step="0.01"
                placeholder="Opcional"
                {...register('monthly_payment', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="liab-installments">Parcelas Restantes</Label>
              <Input
                id="liab-installments"
                type="number"
                step="1"
                placeholder="Ex: 24"
                {...register('remaining_installments', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="liab-due-date">Vencimento da Próxima Parcela</Label>
            <Input id="liab-due-date" type="date" {...register('due_date')} />
          </div>

          <div>
            <Label htmlFor="liab-notes">Observações</Label>
            <Input id="liab-notes" placeholder="Banco credor, contrato, taxa..." {...register('notes')} />
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
                'Cadastrar Passivo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

