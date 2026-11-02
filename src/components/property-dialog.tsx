import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  realEstatePropertySchema,
  type RealEstatePropertyFormData,
} from '@/lib/validations/property'
import { useProperties, type PropertyWithCalculations } from '@/hooks/use-properties'
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
import { AlertCircle, Loader2 } from 'lucide-react'

interface PropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyToEdit?: PropertyWithCalculations | null
}

export function PropertyDialog({
  open,
  onOpenChange,
  propertyToEdit,
}: PropertyDialogProps) {
  const { createProperty, updateProperty } = useProperties()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!propertyToEdit

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RealEstatePropertyFormData>({
    resolver: zodResolver(realEstatePropertySchema),
    defaultValues: {
      name: '',
      builder: '',
      unit: '',
      contract_value: 300000,
      current_market_value: 350000,
      purchase_date: getTodayDateString(),
      keys_delivery_date: null,
      status: 'under_construction',
      down_payment_total: 60000,
      down_payment_paid: 20000,
      financed_amount: 240000,
      bank: 'Caixa Econômica Federal',
      amortization_system: 'sac',
      annual_interest_rate: 0.095, // 9.5% a.a.
      total_term_months: 360,
      paid_months: 0,
      construction_index: 'INCC',
      construction_fees_paid: 0,
      additional_costs_paid: 0,
      notes: '',
    },
  })

  const watchedAmortization = useWatch({ control, name: 'amortization_system', defaultValue: 'sac' })

  useEffect(() => {
    if (propertyToEdit) {
      reset({
        name: propertyToEdit.name,
        builder: propertyToEdit.builder || '',
        unit: propertyToEdit.unit || '',
        contract_value: Number(propertyToEdit.contract_value),
        current_market_value: propertyToEdit.current_market_value
          ? Number(propertyToEdit.current_market_value)
          : null,
        purchase_date: propertyToEdit.purchase_date,
        keys_delivery_date: propertyToEdit.keys_delivery_date,
        status: propertyToEdit.status,
        down_payment_total: Number(propertyToEdit.down_payment_total),
        down_payment_paid: Number(propertyToEdit.down_payment_paid),
        financed_amount: Number(propertyToEdit.financed_amount),
        bank: propertyToEdit.bank || '',
        amortization_system: propertyToEdit.amortization_system,
        annual_interest_rate: Number(propertyToEdit.annual_interest_rate),
        total_term_months: propertyToEdit.total_term_months,
        paid_months: propertyToEdit.paid_months,
        construction_index: propertyToEdit.construction_index as 'INCC' | 'IPCA' | 'CUB' | 'IGP-M' | 'OUTRO',
        construction_fees_paid: Number(propertyToEdit.construction_fees_paid),
        additional_costs_paid: Number(propertyToEdit.additional_costs_paid),
        notes: propertyToEdit.notes || '',
      })
    } else {
      reset({
        name: '',
        builder: '',
        unit: '',
        contract_value: 300000,
        current_market_value: 350000,
        purchase_date: getTodayDateString(),
        keys_delivery_date: null,
        status: 'under_construction',
        down_payment_total: 60000,
        down_payment_paid: 20000,
        financed_amount: 240000,
        bank: 'Caixa Econômica Federal',
        amortization_system: 'sac',
        annual_interest_rate: 0.095,
        total_term_months: 360,
        paid_months: 0,
        construction_index: 'INCC',
        construction_fees_paid: 0,
        additional_costs_paid: 0,
        notes: '',
      })
    }
  }, [propertyToEdit, reset, open])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: RealEstatePropertyFormData) {
    setServerError(null)
    try {
      if (isEditing && propertyToEdit) {
        await updateProperty({
          id: propertyToEdit.id,
          data,
        })
      } else {
        await createProperty(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar imóvel'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Imóvel' : 'Novo Imóvel & Financiamento'}
          </DialogTitle>
          <DialogDescription>
            Controle a aquisição, evolução de obra, entrada e financiamento com simulação SAC / Price.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* Seção 1: Dados do Empreendimento */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              1. Identificação do Imóvel
            </h4>

            <div className="space-y-1.5">
              <Label htmlFor="prop-name">Nome do Imóvel / Empreendimento *</Label>
              <Input
                id="prop-name"
                placeholder="Ex.: Residencial Parque Jardins - Apto 502"
                disabled={isSubmitting}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-builder">Construtora</Label>
                <Input
                  id="prop-builder"
                  placeholder="Ex.: Cyrela, MRV..."
                  disabled={isSubmitting}
                  {...register('builder')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-unit">Unidade / Bloco</Label>
                <Input
                  id="prop-unit"
                  placeholder="Ex.: Torre B, 804"
                  disabled={isSubmitting}
                  {...register('unit')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-status">Estágio Atual</Label>
                <select
                  id="prop-status"
                  disabled={isSubmitting}
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="planning">Em Negociação</option>
                  <option value="under_construction">Em Construção (Planta)</option>
                  <option value="ready">Pronto para Morar</option>
                  <option value="delivered">Chaves Entregues</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-purchase-date">Data da Compra *</Label>
                <Input
                  id="prop-purchase-date"
                  type="date"
                  disabled={isSubmitting}
                  {...register('purchase_date')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-delivery-date">Previsão Entrega das Chaves</Label>
                <Input
                  id="prop-delivery-date"
                  type="date"
                  disabled={isSubmitting}
                  {...register('keys_delivery_date')}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Valores e Entrada */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              2. Valores de Aquisição e Entrada
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-contract">Valor de Contrato (R$) *</Label>
                <Input
                  id="prop-contract"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="300000,00"
                  className="tabular font-bold"
                  disabled={isSubmitting}
                  {...register('contract_value', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-market">Avaliação Atual de Mercado (R$)</Label>
                <Input
                  id="prop-market"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="350000,00"
                  className="tabular"
                  disabled={isSubmitting}
                  {...register('current_market_value', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-down-total">Entrada Total com a Construtora (R$)</Label>
                <Input
                  id="prop-down-total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="60000,00"
                  className="tabular"
                  disabled={isSubmitting}
                  {...register('down_payment_total', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-down-paid">Entrada Já Paga (R$)</Label>
                <Input
                  id="prop-down-paid"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="20000,00"
                  className="tabular"
                  disabled={isSubmitting}
                  {...register('down_payment_paid', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Financiamento Imobiliário SAC / Price */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              3. Financiamento Imobiliário
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-financed">Valor Financiado (R$)</Label>
                <Input
                  id="prop-financed"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="240000,00"
                  className="tabular font-bold"
                  disabled={isSubmitting}
                  {...register('financed_amount', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-bank">Banco Financiador</Label>
                <Input
                  id="prop-bank"
                  placeholder="Ex.: Caixa, Itaú..."
                  disabled={isSubmitting}
                  {...register('bank')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-system">Sistema de Amortização *</Label>
                <select
                  id="prop-system"
                  disabled={isSubmitting}
                  value={watchedAmortization}
                  onChange={(e) =>
                    setValue('amortization_system', e.target.value as 'sac' | 'price')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="sac">SAC (Parcelas Decrescentes)</option>
                  <option value="price">Tabela Price (Parcelas Fixas)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-rate">Taxa de Juros Efetiva Anual (ex: 0.095 = 9.5% a.a.)</Label>
                <Input
                  id="prop-rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  placeholder="0.0950"
                  className="tabular"
                  disabled={isSubmitting}
                  {...register('annual_interest_rate', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-term">Prazo Total (Meses)</Label>
                <Input
                  id="prop-term"
                  type="number"
                  min="1"
                  max="420"
                  placeholder="360"
                  disabled={isSubmitting}
                  {...register('total_term_months', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-paid-months">Meses Já Pagos</Label>
                <Input
                  id="prop-paid-months"
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isSubmitting}
                  {...register('paid_months', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Evolução de Obra e Custos Adicionais */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              4. Evolução de Obra e Custos de Instalação
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-index">Índice da Obra</Label>
                <select
                  id="prop-index"
                  disabled={isSubmitting}
                  {...register('construction_index')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="INCC">INCC</option>
                  <option value="IPCA">IPCA</option>
                  <option value="CUB">CUB</option>
                  <option value="IGP-M">IGP-M</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-const-paid">Juros de Obra Pagos (R$)</Label>
                <Input
                  id="prop-const-paid"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="tabular"
                  disabled={isSubmitting}
                  {...register('construction_fees_paid', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-add-paid">Custos Adicionais (ITBI, Registro, Reforma)</Label>
                <Input
                  id="prop-add-paid"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="tabular"
                  disabled={isSubmitting}
                  {...register('additional_costs_paid', { valueAsNumber: true })}
                />
              </div>
            </div>
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
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Imóvel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
