export interface Profile {
  id: string
  full_name: string | null
  locale: string
  currency: string
  created_at: string
  updated_at: string
}

export type AccountType =
  | 'checking'
  | 'savings'
  | 'digital'
  | 'cash'
  | 'wallet'
  | 'brokerage'
  | 'vault'

export interface Account {
  id: string
  user_id: string
  name: string
  institution: string | null
  type: AccountType
  opening_balance: number
  opened_on: string | null
  color: string | null
  icon: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type CategoryKind = 'income' | 'expense'

export interface Category {
  id: string
  user_id: string
  parent_id: string | null
  kind: CategoryKind
  name: string
  color: string | null
  icon: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type TransactionKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'investment_contribution'
  | 'investment_redemption'

export type TransactionStatus = 'pending' | 'completed' | 'canceled'

export interface Transaction {
  id: string
  user_id: string
  kind: TransactionKind
  status: TransactionStatus
  description: string
  amount: number
  account_id: string
  to_account_id: string | null
  category_id: string | null
  due_date: string
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AccountBalance {
  account_id: string
  user_id: string
  opening_balance: number
  current_balance: number
  projected_balance: number
}

