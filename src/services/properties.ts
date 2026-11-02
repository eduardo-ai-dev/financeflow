import { supabase } from '@/lib/supabase'
import type { RealEstateProperty, RealEstateAmortization } from '@/types/database'
import type { RealEstatePropertyFormData } from '@/lib/validations/property'
import type { RealEstateAmortizationFormData } from '@/lib/validations/amortization'
import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'
import { calculateSac, calculatePrice, simulateAmortization } from '@/lib/mortgage'

export interface PropertyWithCalculations extends RealEstateProperty {
  total_disbursed: number
  outstanding_balance: number
  remaining_months: number
  current_installment: number
  cet_total_estimated: number
  down_payment_remaining: number
  amortizations: RealEstateAmortization[]
}

export async function fetchProperties(): Promise<PropertyWithCalculations[]> {
  const [propsRes, amortRes] = await Promise.all([
    supabase.from('real_estate_properties').select('*').order('created_at', { ascending: false }),
    supabase.from('real_estate_amortizations').select('*').order('date', { ascending: false }),
  ])

  if (propsRes.error) throw propsRes.error
  if (amortRes.error) throw amortRes.error

  const properties = (propsRes.data || []) as RealEstateProperty[]
  const amortizations = (amortRes.data || []) as RealEstateAmortization[]

  const amortMap = new Map<string, RealEstateAmortization[]>()
  amortizations.forEach((a) => {
    const list = amortMap.get(a.property_id) || []
    list.push(a)
    amortMap.set(a.property_id, list)
  })

  return properties.map((prop) => {
    const propAmorts = amortMap.get(prop.id) || []

    // 1. Total desembolsado até o momento
    let totalAmortCents = 0
    propAmorts.forEach((a) => {
      totalAmortCents = sumCents(totalAmortCents, toCents(a.amount))
    })

    const downPaidCents = toCents(prop.down_payment_paid)
    const constFeesCents = toCents(prop.construction_fees_paid)
    const addCostsCents = toCents(prop.additional_costs_paid)

    const totalDisbursedCents = sumCents(
      sumCents(downPaidCents, constFeesCents),
      sumCents(addCostsCents, totalAmortCents)
    )

    // 2. Cálculo do Financiamento Base (SAC ou Price)
    const sim =
      prop.amortization_system === 'sac'
        ? calculateSac(prop.financed_amount, prop.annual_interest_rate, prop.total_term_months)
        : calculatePrice(prop.financed_amount, prop.annual_interest_rate, prop.total_term_months)

    // Saldo após meses já decorridos
    const monthIndex = Math.min(prop.paid_months, sim.schedule.length)
    const scheduledBalance =
      monthIndex > 0 ? (sim.schedule[monthIndex - 1]?.remainingBalance ?? 0) : prop.financed_amount

    // Abate amortizações extraordinárias já realizadas
    const outstandingCents = Math.max(0, subtractCents(toCents(scheduledBalance), totalAmortCents))
    const outstandingBalance = fromCents(outstandingCents)

    const currentInstallment =
      sim.schedule[Math.min(monthIndex, sim.schedule.length - 1)]?.installment ?? sim.initialInstallment

    // Custo Efetivo Total (CET) acumulado estimado
    const contractCents = toCents(prop.contract_value)
    const interestCents = toCents(sim.totalInterestPaid)
    const cetCents = sumCents(
      sumCents(contractCents, interestCents),
      sumCents(constFeesCents, addCostsCents)
    )

    const downRemainingCents = Math.max(
      0,
      subtractCents(toCents(prop.down_payment_total), downPaidCents)
    )

    const remainingMonths = Math.max(0, prop.total_term_months - prop.paid_months)

    return {
      ...prop,
      total_disbursed: fromCents(totalDisbursedCents),
      outstanding_balance: outstandingBalance,
      remaining_months: remainingMonths,
      current_installment: currentInstallment,
      cet_total_estimated: fromCents(cetCents),
      down_payment_remaining: fromCents(downRemainingCents),
      amortizations: propAmorts,
    }
  })
}

export async function createProperty(
  data: RealEstatePropertyFormData
): Promise<RealEstateProperty> {
  const { data: created, error } = await supabase
    .from('real_estate_properties')
    .insert({
      name: data.name.trim(),
      builder: data.builder?.trim() || null,
      unit: data.unit?.trim() || null,
      contract_value: data.contract_value,
      current_market_value: data.current_market_value || null,
      purchase_date: data.purchase_date,
      keys_delivery_date: data.keys_delivery_date || null,
      status: data.status,
      down_payment_total: data.down_payment_total,
      down_payment_paid: data.down_payment_paid,
      financed_amount: data.financed_amount,
      bank: data.bank?.trim() || null,
      amortization_system: data.amortization_system,
      annual_interest_rate: data.annual_interest_rate,
      total_term_months: data.total_term_months,
      paid_months: data.paid_months,
      construction_index: data.construction_index,
      construction_fees_paid: data.construction_fees_paid,
      additional_costs_paid: data.additional_costs_paid,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as RealEstateProperty
}

export async function updateProperty(
  id: string,
  data: Partial<RealEstatePropertyFormData>
): Promise<RealEstateProperty> {
  const payload: Record<string, unknown> = {}

  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.builder !== undefined) payload.builder = data.builder?.trim() || null
  if (data.unit !== undefined) payload.unit = data.unit?.trim() || null
  if (data.contract_value !== undefined) payload.contract_value = data.contract_value
  if (data.current_market_value !== undefined) payload.current_market_value = data.current_market_value || null
  if (data.purchase_date !== undefined) payload.purchase_date = data.purchase_date
  if (data.keys_delivery_date !== undefined) payload.keys_delivery_date = data.keys_delivery_date || null
  if (data.status !== undefined) payload.status = data.status
  if (data.down_payment_total !== undefined) payload.down_payment_total = data.down_payment_total
  if (data.down_payment_paid !== undefined) payload.down_payment_paid = data.down_payment_paid
  if (data.financed_amount !== undefined) payload.financed_amount = data.financed_amount
  if (data.bank !== undefined) payload.bank = data.bank?.trim() || null
  if (data.amortization_system !== undefined) payload.amortization_system = data.amortization_system
  if (data.annual_interest_rate !== undefined) payload.annual_interest_rate = data.annual_interest_rate
  if (data.total_term_months !== undefined) payload.total_term_months = data.total_term_months
  if (data.paid_months !== undefined) payload.paid_months = data.paid_months
  if (data.construction_index !== undefined) payload.construction_index = data.construction_index
  if (data.construction_fees_paid !== undefined) payload.construction_fees_paid = data.construction_fees_paid
  if (data.additional_costs_paid !== undefined) payload.additional_costs_paid = data.additional_costs_paid
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null

  const { data: updated, error } = await supabase
    .from('real_estate_properties')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as RealEstateProperty
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('real_estate_properties').delete().eq('id', id)
  if (error) throw error
}

export async function addAmortization(
  data: RealEstateAmortizationFormData,
  property: RealEstateProperty
): Promise<RealEstateAmortization> {
  // Simula o impacto exato para persistir a economia de juros e redução de prazo
  const remainingMonths = Math.max(1, property.total_term_months - property.paid_months)
  const sim = simulateAmortization(
    property.financed_amount,
    property.annual_interest_rate,
    remainingMonths,
    data.amount,
    data.reduction_type,
    property.amortization_system
  )

  const { data: created, error } = await supabase
    .from('real_estate_amortizations')
    .insert({
      property_id: data.property_id,
      amount: data.amount,
      date: data.date,
      reduction_type: data.reduction_type,
      interest_saved: sim.interestSaved,
      term_reduced: sim.monthsSaved,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as RealEstateAmortization
}

