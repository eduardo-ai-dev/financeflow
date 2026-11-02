import { supabase } from '@/lib/supabase'
import type { CreditCard, CardInvoice, Transaction } from '@/types/database'
import type { CreditCardFormData } from '@/lib/validations/card'
import { isIncludedInCardLimit } from '@/lib/validations/installment'
import { toCents, fromCents } from '@/lib/money'

export interface CreditCardWithLimit extends CreditCard {
  used_amount: number
  available_limit: number
}

export async function fetchCreditCardsWithLimits(): Promise<CreditCardWithLimit[]> {
  const [cardsRes, txsRes, invoicesRes] = await Promise.all([
    supabase
      .from('credit_cards')
      .select('*')
      .order('is_archived', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('transactions')
      .select('card_id, invoice_id, amount, status, notes')
      .eq('kind', 'card_purchase'),
    supabase.from('card_invoices').select('id, status'),
  ])

  if (cardsRes.error) throw cardsRes.error

  const cards = (cardsRes.data || []) as CreditCard[]
  const purchases = (txsRes.data || []) as Array<
    Pick<Transaction, 'card_id' | 'invoice_id' | 'amount' | 'status' | 'notes'>
  >
  const invoicesMap = new Map<string, CardInvoice['status']>(
    ((invoicesRes.data || []) as Array<Pick<CardInvoice, 'id' | 'status'>>).map((inv) => [
      inv.id,
      inv.status,
    ])
  )

  const usedCentsByCard = new Map<string, number>()

  purchases.forEach((tx) => {
    if (!tx.card_id) return
    if (tx.status === 'canceled') return
    // Parcelamentos marcados como "já contabilizados no limite utilizado do cartão"
    // não devem subtrair novamente do limite disponível.
    if (isIncludedInCardLimit(tx.notes)) return

    const invStatus = tx.invoice_id ? invoicesMap.get(tx.invoice_id) : null
    if (invStatus === 'paid') return

    const prev = usedCentsByCard.get(tx.card_id) || 0
    usedCentsByCard.set(tx.card_id, prev + toCents(Number(tx.amount)))
  })

  return cards.map((card) => {
    const initialCents = toCents(Number(card.initial_used_amount ?? 0))
    const purchasesCents = usedCentsByCard.get(card.id) || 0
    const totalUsedCents = initialCents + purchasesCents
    const limitCents = toCents(Number(card.limit_amount))
    const availableCents = Math.max(0, limitCents - totalUsedCents)

    return {
      ...card,
      used_amount: fromCents(totalUsedCents),
      available_limit: fromCents(availableCents),
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
