import { supabase } from '@/lib/supabase'
import { getTodayDateString } from '@/lib/date'
import type { Transaction, Account, Category } from '@/types/database'
import type { TransactionFormData } from '@/lib/validations/transaction'
import { cleanUserNotes } from '@/lib/validations/installment'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sanitiza termos de busca removendo curingas e delimitadores especiais do PostgREST
 * para evitar manipulação de filtros.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[%_(),.*\\]/g, ' ')
    .trim()
    .slice(0, 100)
}

export interface TransactionWithDetails extends Transaction {
  account?: Account | null
  to_account?: Account | null
  category?: Category | null
}

export interface TransactionFilters {
  kind?: string | string[]
  status?: string
  accountId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export async function fetchTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionWithDetails[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('due_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.kind) {
    if (Array.isArray(filters.kind)) {
      query = query.in('kind', filters.kind)
    } else {
      query = query.eq('kind', filters.kind)
    }
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.accountId && UUID_REGEX.test(filters.accountId)) {
    query = query.or(
      `account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`
    )
  }

  if (filters.categoryId && UUID_REGEX.test(filters.categoryId)) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters.startDate && DATE_REGEX.test(filters.startDate)) {
    query = query.gte('due_date', filters.startDate)
  }

  if (filters.endDate && DATE_REGEX.test(filters.endDate)) {
    query = query.lte('due_date', filters.endDate)
  }

  if (filters.search) {
    const safeSearch = sanitizeSearchTerm(filters.search)
    if (safeSearch.length > 0) {
      query = query.ilike('description', `%${safeSearch}%`)
    }
  }

  const [txRes, accountsRes, categoriesRes] = await Promise.all([
    query,
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
  ])

  if (txRes.error) throw txRes.error

  const accountsMap = new Map<string, Account>(
    ((accountsRes.data || []) as Account[]).map((a) => [a.id, a])
  )
  const categoriesMap = new Map<string, Category>(
    ((categoriesRes.data || []) as Category[]).map((c) => [c.id, c])
  )

  return ((txRes.data || []) as Transaction[]).map((tx) => ({
    ...tx,
    notes: cleanUserNotes(tx.notes),
    account: tx.account_id ? accountsMap.get(tx.account_id) ?? null : null,
    to_account: tx.to_account_id ? accountsMap.get(tx.to_account_id) ?? null : null,
    category: tx.category_id ? categoriesMap.get(tx.category_id) ?? null : null,
  }))
}

export async function createTransaction(data: TransactionFormData): Promise<Transaction> {
  const isTransfer = data.kind === 'transfer'
  const isExpense = data.kind === 'expense'
  const isCompleted = data.status === 'completed'

  // Nota (Regra 5): user_id NUNCA é enviado pelo cliente; é preenchido no banco via JWT (auth.uid())
  const basePayload = {
    kind: data.kind,
    status: data.status,
    description: data.description.trim(),
    amount: data.amount,
    account_id: data.account_id,
    to_account_id: isTransfer ? data.to_account_id : null,
    category_id: isTransfer ? null : data.category_id || null,
    due_date: data.due_date,
    paid_date: isCompleted ? data.paid_date || data.due_date : null,
    notes: data.notes?.trim() || null,
  }

  const payloadWithClassification = {
    ...basePayload,
    ...(isExpense && data.expense_classification
      ? { expense_classification: data.expense_classification }
      : {}),
  }

  const { data: created, error } = await supabase
    .from('transactions')
    .insert(payloadWithClassification)
    .select()
    .single()

  if (error) {
    // Fallback resiliente caso a migração 0007 ainda não tenha sido rodada no Supabase
    if (error.message?.includes('expense_classification')) {
      const { data: fallbackCreated, error: fallbackError } = await supabase
        .from('transactions')
        .insert(basePayload)
        .select()
        .single()

      if (fallbackError) throw fallbackError
      return fallbackCreated as Transaction
    }
    throw error
  }

  return created as Transaction
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionFormData>
): Promise<Transaction> {
  const isTransfer = data.kind === 'transfer'
  const isCompleted = data.status === 'completed'

  const payload: Record<string, unknown> = {}

  if (data.description !== undefined) payload.description = data.description.trim()
  if (data.amount !== undefined) payload.amount = data.amount
  if (data.account_id !== undefined) payload.account_id = data.account_id
  if (data.due_date !== undefined) payload.due_date = data.due_date
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null

  if (data.kind !== undefined) {
    payload.kind = data.kind
    if (isTransfer) {
      payload.to_account_id = data.to_account_id
      payload.category_id = null
      payload.expense_classification = null
    } else {
      payload.to_account_id = null
      payload.category_id = data.category_id || null
      if (data.kind === 'expense') {
        payload.expense_classification = data.expense_classification ?? 'variable'
      } else {
        payload.expense_classification = null
      }
    }
  } else {
    if (data.to_account_id !== undefined) payload.to_account_id = data.to_account_id
    if (data.category_id !== undefined) payload.category_id = data.category_id
    if (data.expense_classification !== undefined) {
      payload.expense_classification = data.expense_classification
    }
  }

  if (data.status !== undefined) {
    payload.status = data.status
    payload.paid_date = isCompleted ? data.paid_date || data.due_date : null
  } else if (data.paid_date !== undefined) {
    payload.paid_date = data.paid_date
  }

  const { data: updated, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.message?.includes('expense_classification')) {
      const { expense_classification: _ignored, ...fallbackPayload } = payload
      void _ignored
      const { data: fallbackUpdated, error: fallbackError } = await supabase
        .from('transactions')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .single()
      if (fallbackError) throw fallbackError
      return fallbackUpdated as Transaction
    }
    throw error
  }

  return updated as Transaction
}

export async function markTransactionCompleted(
  id: string,
  paidDate?: string
): Promise<Transaction> {
  const today = getTodayDateString()
  const dateToUse = paidDate || today

  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      paid_date: dateToUse,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export async function markTransactionPending(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'pending',
      paid_date: null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}
