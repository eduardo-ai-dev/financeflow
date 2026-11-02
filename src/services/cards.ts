import { supabase } from '@/lib/supabase'
import type { CreditCard, CardLimit } from '@/types/database'
import type { CreditCardFormData } from '@/lib/validations/card'

export interface CreditCardWithLimit extends CreditCard {
  used_amount: number
  available_limit: number
}

export async function fetchCreditCardsWithLimits(): Promise<CreditCardWithLimit[]> {
  const [cardsRes, limitsRes] = await Promise.all([
    supabase
      .from('credit_cards')
      .select('*')
      .order('is_archived', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('card_limits').select('*'),
  ])

  if (cardsRes.error) throw cardsRes.error
  // card_limits pode não ter registros se a view ainda não tiver dados
  const cards = (cardsRes.data || []) as CreditCard[]
  const limits = (limitsRes.data || []) as CardLimit[]

  const limitsMap = new Map<string, CardLimit>()
  limits.forEach((l) => limitsMap.set(l.card_id, l))

  return cards.map((card) => {
    const limit = limitsMap.get(card.id)
    const used = limit?.used_amount ?? 0
    return {
      ...card,
      used_amount: used,
      available_limit: Math.max(0, Number(card.limit_amount) - used),
    }
  })
}

export async function createCreditCard(data: CreditCardFormData): Promise<CreditCard> {
  const { data: created, error } = await supabase
    .from('credit_cards')
    .insert({
      name: data.name.trim(),
      institution: data.institution?.trim() || null,
      brand: data.brand,
      limit_amount: data.limit_amount,
      initial_used_amount: data.initial_used_amount,
      closing_day: data.closing_day,
      due_day: data.due_day,
      color: data.color || '#4f46e5',
      default_account_id: data.default_account_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as CreditCard
}

export async function updateCreditCard(
  id: string,
  data: Partial<CreditCardFormData>
): Promise<CreditCard> {
  const { data: updated, error } = await supabase
    .from('credit_cards')
    .update({
      ...(data.name ? { name: data.name.trim() } : {}),
      institution: data.institution !== undefined ? (data.institution?.trim() || null) : undefined,
      ...(data.brand ? { brand: data.brand } : {}),
      ...(data.limit_amount !== undefined ? { limit_amount: data.limit_amount } : {}),
      ...(data.initial_used_amount !== undefined ? { initial_used_amount: data.initial_used_amount } : {}),
      ...(data.closing_day !== undefined ? { closing_day: data.closing_day } : {}),
      ...(data.due_day !== undefined ? { due_day: data.due_day } : {}),
      ...(data.color ? { color: data.color } : {}),
      ...(data.default_account_id !== undefined ? { default_account_id: data.default_account_id || null } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as CreditCard
}

export async function toggleArchiveCreditCard(
  id: string,
  is_archived: boolean
): Promise<void> {
  const { error } = await supabase
    .from('credit_cards')
    .update({ is_archived })
    .eq('id', id)

  if (error) throw error
}

export async function deleteCreditCard(id: string): Promise<void> {
  const { error } = await supabase.from('credit_cards').delete().eq('id', id)
  if (error) throw error
}

