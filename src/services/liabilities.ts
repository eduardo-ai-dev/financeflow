import { supabase } from '@/lib/supabase'
import type { Liability } from '@/types/database'
import type { LiabilityFormData } from '@/lib/validations/liability'

export async function fetchLiabilities(): Promise<Liability[]> {
  const { data, error } = await supabase
    .from('liabilities')
    .select('*')
    .order('current_balance', { ascending: false })

  if (error) throw error
  return (data || []) as Liability[]
}

export async function createLiability(data: LiabilityFormData): Promise<Liability> {
  const { data: created, error } = await supabase
    .from('liabilities')
    .insert({
      name: data.name.trim(),
      type: data.type,
      total_amount: data.total_amount,
      current_balance: data.current_balance,
      monthly_payment: data.monthly_payment || null,
      remaining_installments: data.remaining_installments || null,
      interest_rate_monthly: data.interest_rate_monthly || null,
      due_date: data.due_date || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as Liability
}

export async function updateLiability(
  id: string,
  data: Partial<LiabilityFormData>
): Promise<Liability> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.type !== undefined) payload.type = data.type
  if (data.total_amount !== undefined) payload.total_amount = data.total_amount
  if (data.current_balance !== undefined) payload.current_balance = data.current_balance
  if (data.monthly_payment !== undefined) payload.monthly_payment = data.monthly_payment || null
  if (data.remaining_installments !== undefined)
    payload.remaining_installments = data.remaining_installments || null
  if (data.interest_rate_monthly !== undefined)
    payload.interest_rate_monthly = data.interest_rate_monthly || null
  if (data.due_date !== undefined) payload.due_date = data.due_date || null
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null

  const { data: updated, error } = await supabase
    .from('liabilities')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Liability
}

export async function deleteLiability(id: string): Promise<void> {
  const { error } = await supabase.from('liabilities').delete().eq('id', id)
  if (error) throw error
}

