import { supabase } from '@/lib/supabase'
import type { Account, AccountBalance } from '@/types/database'
import type { AccountFormData } from '@/lib/validations/account'

export interface AccountWithBalance extends Account {
  current_balance: number
  projected_balance: number
}

export async function fetchAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const [accountsRes, balancesRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .order('is_archived', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('account_balances').select('*'),
  ])

  if (accountsRes.error) throw accountsRes.error
  if (balancesRes.error) throw balancesRes.error

  const accounts = (accountsRes.data || []) as Account[]
  const balances = (balancesRes.data || []) as AccountBalance[]

  const balancesMap = new Map<string, AccountBalance>()
  balances.forEach((b) => balancesMap.set(b.account_id, b))

  return accounts.map((acc) => {
    const bal = balancesMap.get(acc.id)
    return {
      ...acc,
      current_balance: bal?.current_balance ?? Number(acc.opening_balance),
      projected_balance: bal?.projected_balance ?? Number(acc.opening_balance),
    }
  })
}

export async function createAccount(data: AccountFormData): Promise<Account> {
  const { data: created, error } = await supabase
    .from('accounts')
    .insert({
      name: data.name.trim(),
      institution: data.institution?.trim() || null,
      type: data.type,
      opening_balance: data.opening_balance,
      color: data.color,
    })
    .select()
    .single()

  if (error) throw error
  return created as Account
}

export async function updateAccount(id: string, data: Partial<AccountFormData>): Promise<Account> {
  const { data: updated, error } = await supabase
    .from('accounts')
    .update({
      ...(data.name ? { name: data.name.trim() } : {}),
      institution: data.institution ? data.institution.trim() : null,
      ...(data.type ? { type: data.type } : {}),
      ...(data.color ? { color: data.color } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Account
}

export async function toggleArchiveAccount(id: string, is_archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived })
    .eq('id', id)

  if (error) throw error
}

