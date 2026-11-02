import { supabase } from '@/lib/supabase'
import type { Installment, CreditCard, Account, Category } from '@/types/database'
import type { InstallmentFormData } from '@/lib/validations/installment'
import { toCents, fromCents, multiplyCents } from '@/lib/money'
import { addMonths, format, parseISO } from 'date-fns'

export interface InstallmentWithDetails extends Installment {
  card?: CreditCard | null
  account?: Account | null
  category?: Category | null
  paid_installments: number
  remaining_installments: number
  remaining_amount: number
  progress_percent: number
  end_date: string
}

export async function fetchInstallments(status?: string): Promise<InstallmentWithDetails[]> {
  let query = supabase
    .from('installments')
    .select(
      `
      *,
      card:card_id (*),
      account:account_id (*),
      category:category_id (*)
    `
    )
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: installments, error } = await query
  if (error) throw error

  // Busca transações vinculadas para contar parcelas pagas
  const installmentIds = (installments || []).map((i) => i.id)
  let paidCountMap = new Map<string, number>()

  if (installmentIds.length > 0) {
    const { data: txs, error: txsError } = await supabase
      .from('transactions')
      .select('installment_id, status')
      .in('installment_id', installmentIds)

    if (!txsError && txs) {
      txs.forEach((tx) => {
        if (!tx.installment_id) return
        if (tx.status === 'completed') {
          const curr = paidCountMap.get(tx.installment_id) || 0
          paidCountMap.set(tx.installment_id, curr + 1)
        }
      })
    }
  }

  return (installments || []).map((inst) => {
    const paid = paidCountMap.get(inst.id) || 0
    const total = inst.total_installments
    const remaining = Math.max(0, total - paid)
    const installmentCents = toCents(inst.installment_amount)
    const remainingCents = multiplyCents(installmentCents, remaining)
    const progress = total > 0 ? Math.round((paid / total) * 100) : 0

    // Calcula data final estimada
    const startDate = parseISO(inst.start_date)
    const finalDate = addMonths(startDate, total - 1)
    const endDateStr = format(finalDate, 'yyyy-MM-dd')

    return {
      ...inst,
      paid_installments: paid,
      remaining_installments: remaining,
      remaining_amount: fromCents(remainingCents),
      progress_percent: progress,
      end_date: endDateStr,
    }
  })
}

export async function createInstallment(data: InstallmentFormData): Promise<Installment> {
  const totalCents = toCents(data.total_amount)
  const installmentCents = Math.round(totalCents / data.total_installments)
  const installmentAmount = fromCents(installmentCents)

  // 1. Cria o registro mestre de parcelamento
  const { data: created, error } = await supabase
    .from('installments')
    .insert({
      description: data.description.trim(),
      total_amount: data.total_amount,
      installment_amount: installmentAmount,
      total_installments: data.total_installments,
      card_id: data.card_id || null,
      account_id: data.card_id ? null : data.account_id || null,
      category_id: data.category_id || null,
      start_date: data.start_date,
      status: 'active',
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  const installment = created as Installment

  // 2. Gera as transações individuais para cada uma das parcelas
  const startDate = parseISO(data.start_date)
  const isCard = !!data.card_id
  const transactionsToInsert = []

  for (let i = 1; i <= data.total_installments; i++) {
    const dueDate = format(addMonths(startDate, i - 1), 'yyyy-MM-dd')
    const desc = `${data.description.trim()} (${i}/${data.total_installments})`

    transactionsToInsert.push({
      kind: isCard ? 'card_purchase' : 'expense',
      status: 'pending',
      description: desc,
      amount: installmentAmount,
      card_id: isCard ? data.card_id : null,
      account_id: isCard ? null : data.account_id || null,
      category_id: data.category_id || null,
      due_date: dueDate,
      paid_date: null,
      installment_id: installment.id,
      installment_number: i,
    })
  }

  const { error: txsError } = await supabase.from('transactions').insert(transactionsToInsert)
  if (txsError) throw txsError

  return installment
}

export async function cancelInstallment(id: string): Promise<void> {
  // Marca o parcelamento como cancelado
  const { error: instError } = await supabase
    .from('installments')
    .update({ status: 'canceled' })
    .eq('id', id)

  if (instError) throw instError

  // Cancela as parcelas futuras que ainda estejam pendentes
  const { error: txError } = await supabase
    .from('transactions')
    .update({ status: 'canceled' })
    .eq('installment_id', id)
    .eq('status', 'pending')

  if (txError) throw txError
}
