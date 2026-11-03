import { supabase } from '@/lib/supabase'
import type { Account, AccountBalance, Goal, Transaction } from '@/types/database'
import type { VaultFormData, VaultPurpose } from '@/lib/validations/vault'
import { toCents, fromCents } from '@/lib/money'

export interface VaultItem {
  id: string
  name: string
  institution: string | null
  color: string
  purpose: VaultPurpose
  current_balance: number
  projected_balance: number
  target_amount: number
  progress_percent: number
  remaining_amount: number
  is_archived: boolean
  linkedGoalId?: string | null
  notes?: string | null
  recentTransactions: Transaction[]
  created_at: string
}

function parsePurposeFromGoal(goal?: Goal | null): VaultPurpose {
  if (!goal) return 'free'
  const text = `${goal.name} ${goal.notes || ''}`.toLowerCase()
  if (text.includes('emergencia') || text.includes('emergência')) return 'emergency'
  if (text.includes('oportunidade') || text.includes('aporte estratégico')) return 'opportunity'
  if (text.includes('ipva') || text.includes('iptu') || text.includes('imposto')) return 'taxes'
  if (text.includes('viagem') || text.includes('sonho') || text.includes('reforma')) return 'goals'
  return 'free'
}

export async function fetchVaultsWithDetails(): Promise<VaultItem[]> {
  const [accountsRes, balancesRes, goalsRes, txsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('type', 'vault')
      .order('is_archived', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('account_balances').select('*'),
    supabase.from('goals').select('*'),
    supabase
      .from('transactions')
      .select('*')
      .order('due_date', { ascending: false })
      .limit(300),
  ])

  if (accountsRes.error) throw accountsRes.error
  if (balancesRes.error) throw balancesRes.error

  const accounts = (accountsRes.data || []) as Account[]
  const balances = (balancesRes.data || []) as AccountBalance[]
  const goals = (goalsRes.data || []) as Goal[]
  const allTxs = (txsRes.data || []) as Transaction[]

  const balancesMap = new Map<string, AccountBalance>()
  balances.forEach((b) => balancesMap.set(b.account_id, b))

  // Mapeia metas vinculadas a esta conta de cofre
  const goalsByAccount = new Map<string, Goal>()
  goals.forEach((g) => {
    if (g.account_id) {
      goalsByAccount.set(g.account_id, g)
    }
  })

  // Transações de transferências deste cofre
  const txsByVault = new Map<string, Transaction[]>()
  allTxs.forEach((tx) => {
    if (tx.kind === 'transfer') {
      if (tx.account_id) {
        const list = txsByVault.get(tx.account_id) || []
        list.push(tx)
        txsByVault.set(tx.account_id, list)
      }
      if (tx.to_account_id) {
        const list = txsByVault.get(tx.to_account_id) || []
        list.push(tx)
        txsByVault.set(tx.to_account_id, list)
      }
    }
  })

  return accounts.map((acc) => {
    const bal = balancesMap.get(acc.id)
    const current = bal?.current_balance ?? Number(acc.opening_balance)
    const projected = bal?.projected_balance ?? Number(acc.opening_balance)
    const linkedGoal = goalsByAccount.get(acc.id)

    const target = linkedGoal ? Number(linkedGoal.target_amount) : 0
    const progress =
      target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
    const remaining = target > 0 ? Math.max(0, fromCents(toCents(target) - toCents(current))) : 0

    const recent = (txsByVault.get(acc.id) || []).slice(0, 5)

    return {
      id: acc.id,
      name: acc.name,
      institution: acc.institution,
      color: acc.color || '#10b981',
      purpose: parsePurposeFromGoal(linkedGoal),
      current_balance: current,
      projected_balance: projected,
      target_amount: target,
      progress_percent: progress,
      remaining_amount: remaining,
      is_archived: acc.is_archived,
      linkedGoalId: linkedGoal?.id,
      notes: linkedGoal?.notes || null,
      recentTransactions: recent,
      created_at: acc.created_at,
    }
  })
}

export async function createVault(data: VaultFormData): Promise<VaultItem> {
  // 1. Cria a conta do tipo 'vault'
  const { data: createdAcc, error: accError } = await supabase
    .from('accounts')
    .insert({
      name: data.name.trim(),
      institution: data.institution?.trim() || null,
      type: 'vault',
      opening_balance: data.opening_balance,
      color: data.color,
    })
    .select()
    .single()

  if (accError) throw accError
  const acc = createdAcc as Account

  // 2. Se houver meta definida, cria a meta atrelada
  let linkedGoal: Goal | null = null
  if (data.target_amount > 0) {
    const { data: createdGoal, error: goalError } = await supabase
      .from('goals')
      .insert({
        name: `Cofre: ${data.name.trim()}`,
        priority: data.purpose === 'emergency' ? 'essential' : 'medium',
        target_amount: data.target_amount,
        current_amount: data.opening_balance,
        account_id: acc.id,
        status: 'in_progress',
        notes: data.notes ? data.notes.trim() : null,
      })
      .select()
      .maybeSingle()

    if (!goalError && createdGoal) {
      linkedGoal = createdGoal as Goal
    }
  }

  const current = Number(acc.opening_balance)
  const target = data.target_amount
  const progress =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
  const remaining = target > 0 ? Math.max(0, fromCents(toCents(target) - toCents(current))) : 0

  return {
    id: acc.id,
    name: acc.name,
    institution: acc.institution,
    color: acc.color || '#10b981',
    purpose: data.purpose,
    current_balance: current,
    projected_balance: current,
    target_amount: target,
    progress_percent: progress,
    remaining_amount: remaining,
    is_archived: acc.is_archived,
    linkedGoalId: linkedGoal?.id,
    notes: data.notes || null,
    recentTransactions: [],
    created_at: acc.created_at,
  }
}

export async function updateVault(
  id: string,
  data: Partial<VaultFormData>
): Promise<void> {
  const accPayload: Record<string, unknown> = {}
  if (data.name !== undefined) accPayload.name = data.name.trim()
  if (data.institution !== undefined) {
    accPayload.institution = data.institution ? data.institution.trim() : null
  }
  if (data.color !== undefined) accPayload.color = data.color

  if (Object.keys(accPayload).length > 0) {
    const { error: accError } = await supabase
      .from('accounts')
      .update(accPayload)
      .eq('id', id)
    if (accError) throw accError
  }

  // Atualiza ou cria meta vinculada se target_amount foi informado
  if (data.target_amount !== undefined) {
    const { data: existingGoals } = await supabase
      .from('goals')
      .select('id')
      .eq('account_id', id)
      .limit(1)

    const existingGoal = existingGoals?.[0]
    if (existingGoal) {
      await supabase
        .from('goals')
        .update({
          target_amount: data.target_amount,
          ...(data.name ? { name: `Cofre: ${data.name.trim()}` } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        })
        .eq('id', existingGoal.id)
    } else if (data.target_amount > 0) {
      await supabase.from('goals').insert({
        name: `Cofre: ${data.name || 'Reserva'}`,
        priority: 'essential',
        target_amount: data.target_amount,
        current_amount: 0,
        account_id: id,
        status: 'in_progress',
        notes: data.notes?.trim() || null,
      })
    }
  }
}

export async function depositToVault(params: {
  vault_id: string
  vault_name: string
  account_id: string
  amount: number
  date: string
  notes?: string | null
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      kind: 'transfer',
      status: 'completed',
      description: `Aporte no cofre: ${params.vault_name}`,
      amount: params.amount,
      account_id: params.account_id, // sai da conta corrente
      to_account_id: params.vault_id, // entra no cofre
      due_date: params.date,
      paid_date: params.date,
      notes: params.notes ? params.notes.trim() : null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export async function withdrawFromVault(params: {
  vault_id: string
  vault_name: string
  account_id: string
  amount: number
  date: string
  notes?: string | null
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      kind: 'transfer',
      status: 'completed',
      description: `Resgate do cofre: ${params.vault_name}`,
      amount: params.amount,
      account_id: params.vault_id, // sai do cofre
      to_account_id: params.account_id, // volta para a conta corrente
      due_date: params.date,
      paid_date: params.date,
      notes: params.notes ? params.notes.trim() : null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export async function toggleArchiveVault(id: string, is_archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived })
    .eq('id', id)

  if (error) throw error
}
