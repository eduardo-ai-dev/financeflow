import { supabase } from '@/lib/supabase'
import type { Installment, CreditCard, Account, Category } from '@/types/database'
import {
  encodeInstallmentNotes,
  isIncludedInCardLimit,
  cleanUserNotes,
  type InstallmentFormData,
} from '@/lib/validations/installment'
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
  already_included_in_limit: boolean
}

export async function fetchInstallments(status?: string): Promise<InstallmentWithDetails[]> {
  let query = supabase
    .from('installments')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const [instRes, cardsRes, accountsRes, categoriesRes] = await Promise.all([
    query,
    supabase.from('credit_cards').select('*'),
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
  ])

  if (instRes.error) throw instRes.error

  const installments = (instRes.data || []) as Installment[]
  const cardsMap = new Map<string, CreditCard>(
    ((cardsRes.data || []) as CreditCard[]).map((c) => [c.id, c])
  )
  const accountsMap = new Map<string, Account>(
    ((accountsRes.data || []) as Account[]).map((a) => [a.id, a])
  )
  const categoriesMap = new Map<string, Category>(
    ((categoriesRes.data || []) as Category[]).map((cat) => [cat.id, cat])
  )

  // Busca transações vinculadas para contar parcelas pagas
  const installmentIds = installments.map((i) => i.id)
  const paidCountMap = new Map<string, number>()

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

  return installments.map((inst) => {
    const paid = paidCountMap.get(inst.id) || 0
    const total = inst.total_installments
    const remaining = Math.max(0, total - paid)
    const installmentCents = toCents(inst.installment_amount)
    const remainingCents = multiplyCents(installmentCents, remaining)
    const progress = total > 0 ? Math.round((paid / total) * 100) : 0

    // Calcula data final estimada
    const startDate = parseISO(inst.start_date)
    const finalDate = addMonths(startDate, Math.max(0, total - 1))
    const endDateStr = format(finalDate, 'yyyy-MM-dd')

    return {
      ...inst,
      notes: cleanUserNotes(inst.notes),
      already_included_in_limit: isIncludedInCardLimit(inst.notes),
      card: inst.card_id ? cardsMap.get(inst.card_id) ?? null : null,
      account: inst.account_id ? accountsMap.get(inst.account_id) ?? null : null,
      category: inst.category_id ? categoriesMap.get(inst.category_id) ?? null : null,
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

  const isCard = Boolean(data.card_id)
  const alreadyInLimit = isCard && Boolean(data.already_included_in_limit)
  const encodedNotes = encodeInstallmentNotes(data.notes, alreadyInLimit)

  // 1. Cria o registro mestre de parcelamento
  const { data: created, error } = await supabase
    .from('installments')
    .insert({
      description: data.description.trim(),
      total_amount: data.total_amount,
      installment_amount: installmentAmount,
      total_installments: data.total_installments,
      card_id: isCard ? data.card_id : null,
      account_id: isCard ? null : data.account_id || null,
      category_id: data.category_id || null,
      start_date: data.start_date,
      status: 'active',
      notes: encodedNotes,
    })
    .select()
    .single()

  if (error) throw error
  const installment = created as Installment

  // 2. Gera as transações individuais para cada uma das parcelas
  const startDate = parseISO(data.start_date)
  const transactionsToInsert = []

  for (let i = 1; i <= data.total_installments; i++) {
    const dueDate = format(addMonths(startDate, i - 1), 'yyyy-MM-dd')
    const desc = `${data.description.trim()} (${i}/${data.total_installments})`

    // Nota sobre transactions_accounts_shape:
    // Para despesas comuns (kind = 'expense'), account_id é obrigatório no banco.
    // Só geramos transações automáticas se houver cartão ou conta selecionada.
    if (isCard || data.account_id) {
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
        notes: encodedNotes,
      })
    }
  }

  if (transactionsToInsert.length > 0) {
    const { error: txsError } = await supabase.from('transactions').insert(transactionsToInsert)
    if (txsError) throw txsError
  }

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
