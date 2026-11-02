import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  investmentSchema,
  investmentTypes,
  liquidityTypes,
  type InvestmentFormData,
} from '@/lib/validations/investment'
import { useInvestments, type InvestmentWithStats } from '@/hooks/use-investments'
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

interface InvestmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentToEdit?: InvestmentWithStats | null
}

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function InvestmentDialog({
  open,
  onOpenChange,
  investmentToEdit,
}: InvestmentDialogProps) {
  const { createInvestment, updateInvestment } = useInvestments()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!investmentToEdit
  const [todayStr] = useState(() => getTodayString())

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: '',
      ticker: '',
      type: 'fixed_income',
      institution: '',
      initial_amount: 0,
      total_invested: 0,
      current_amount: 0,
      start_date: todayStr,
      due_date: null,
      liquidity: 'daily',
      benchmark: 'CDI',
      rate: '100% CDI',
      notes: '',
    },
  })

  const selectedType = useWatch({ control, name: 'type', defaultValue: 'fixed_income' })
  const selectedLiquidity = useWatch({ control, name: 'liquidity', defaultValue: 'daily' })

  useEffect(() => {
    if (investmentToEdit) {
      reset({
        name: investmentToEdit.name,
        ticker: investmentToEdit.ticker || '',
        type: investmentToEdit.type,
        institution: investmentToEdit.institution,
        initial_amount: investmentToEdit.initial_amount,
        total_invested: investmentToEdit.total_invested,
        current_amount: investmentToEdit.current_amount,
        start_date: investmentToEdit.start_date,
        due_date: investmentToEdit.due_date || null,
        liquidity: investmentToEdit.liquidity,
        benchmark: investmentToEdit.benchmark || '',
        rate: investmentToEdit.rate || '',
        notes: investmentToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        ticker: '',
        type: 'fixed_income',
        institution: '',
        initial_amount: 0,
        total_invested: 0,
        current_amount: 0,
        start_date: todayStr,
        due_date: null,
        liquidity: 'daily',
        benchmark: 'CDI',
        rate: '100% CDI',
        notes: '',
      })
    }
  }, [investmentToEdit, reset, todayStr, open])

  function handleDialogChange(isOpen: boolean) {
    if (!isOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: InvestmentFormData) {
    try {
      setServerError(null)
      if (isEditing && investmentToEdit) {
        await updateInvestment({ id: investmentToEdit.id, data })
      } else {
        await createInvestment(data)
      }
      handleDialogChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar investimento.'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Posição de Investimento' : 'Novo Ativo na Carteira'}
          </DialogTitle>
          <DialogDescription>
            Cadastre ativos de renda fixa, ações, FIIs ou fundos sem misturar com despesas de consumo.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="inv-name">Nome do Investimento *</Label>
              <Input
                id="inv-name"
                placeholder="Ex: Tesouro Selic 2029, CDB Inter 110% CDI"
                {...register('name')}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="inv-ticker">Ticker / Código</Label>
              <Input id="inv-ticker" placeholder="Ex: PETR4, HGLG11" {...register('ticker')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inv-type">Tipo de Ativo</Label>
              <select
                id="inv-type"
                value={selectedType}
                onChange={(e) => setValue('type', e.target.value as InvestmentFormData['type'])}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {investmentTypes.map((t) => (
                  <option key={t.value} value={t.value} className="bg-popover text-popover-foreground">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="inv-institution">Instituição / Corretora *</Label>
              <Input
                id="inv-institution"
                placeholder="Ex: XP, BTG Pactual, Nubank"
                {...register('institution')}
              />
              {errors.institution && (
                <p className="mt-1 text-xs text-destructive">{errors.institution.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inv-total-invested">Custo Total Aportado (R$) *</Label>
              <Input
                id="inv-total-invested"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('total_invested', { valueAsNumber: true })}
              />
              {errors.total_invested && (
                <p className="mt-1 text-xs text-destructive">{errors.total_invested.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="inv-current-amount">Saldo Atual de Mercado (R$) *</Label>
              <Input
                id="inv-current-amount"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inv-start-date">Data do Primeiro Aporte *</Label>
              <Input id="inv-start-date" type="date" {...register('start_date')} />
              {errors.start_date && (
                <p className="mt-1 text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="inv-liquidity">Prazo de Resgate (Liquidez)</Label>
              <select
                id="inv-liquidity"
                value={selectedLiquidity}
                onChange={(e) => setValue('liquidity', e.target.value as InvestmentFormData['liquidity'])}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {liquidityTypes.map((l) => (
                  <option key={l.value} value={l.value} className="bg-popover text-popover-foreground">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="inv-benchmark">Indexador</Label>
              <Input id="inv-benchmark" placeholder="Ex: CDI, IPCA, IBOV" {...register('benchmark')} />
            </div>
            <div>
              <Label htmlFor="inv-rate">Rentabilidade / Taxa</Label>
              <Input id="inv-rate" placeholder="Ex: 110% CDI, IPCA+6%" {...register('rate')} />
            </div>
            <div>
              <Label htmlFor="inv-due-date">Vencimento (se houver)</Label>
              <Input id="inv-due-date" type="date" {...register('due_date')} />
            </div>
          </div>

          <div>
            <Label htmlFor="inv-notes">Observações</Label>
            <Input id="inv-notes" placeholder="Estratégia, objetivo ou tese..." {...register('notes')} />
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
                'Adicionar à Carteira'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
