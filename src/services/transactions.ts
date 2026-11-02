import { supabase } from '@/lib/supabase'
import type { Transaction, Account, Category } from '@/types/database'
import type { TransactionFormData } from '@/lib/validations/transaction'

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
    .select(
      `
      *,
      account:account_id (*),
      to_account:to_account_id (*),
      category:category_id (*)
    `
    )
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

  if (filters.accountId) {
    query = query.or(`account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`)
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters.startDate) {
    query = query.gte('due_date', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('due_date', filters.endDate)
  }

  if (filters.search) {
    query = query.ilike('description', `%${filters.search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []) as TransactionWithDetails[]
}

export async function createTransaction(data: TransactionFormData): Promise<Transaction> {
  const isTransfer = data.kind === 'transfer'
  const isCompleted = data.status === 'completed'

  const payload = {
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

  const { data: created, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
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
    } else {
      payload.to_account_id = null
      payload.category_id = data.category_id || null
    }
  } else {
    if (data.to_account_id !== undefined) payload.to_account_id = data.to_account_id
    if (data.category_id !== undefined) payload.category_id = data.category_id
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

  if (error) throw error
  return updated as Transaction
}

export async function markTransactionCompleted(
  id: string,
  paidDate?: string
): Promise<Transaction> {
  const today = new Date().toISOString().split('T')[0]
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

