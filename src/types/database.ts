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

export type CardBrand = 'mastercard' | 'visa' | 'elo' | 'amex' | 'hipercard' | 'other'

export interface CreditCard {
  id: string
  user_id: string
  name: string
  institution: string | null
  brand: CardBrand
  limit_amount: number
  closing_day: number
  due_day: number
  color: string | null
  default_account_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue'

export interface CardInvoice {
  id: string
  user_id: string
  card_id: string
  month: number
  year: number
  closing_date: string
  due_date: string
  status: InvoiceStatus
  payment_transaction_id: string | null
  created_at: string
  updated_at: string
}

export type InstallmentStatus = 'active' | 'completed' | 'canceled'

export interface Installment {
  id: string
  user_id: string
  card_id: string | null
  account_id: string | null
  category_id: string | null
  description: string
  total_amount: number
  installment_amount: number
  total_installments: number
  start_date: string
  status: InstallmentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CardLimit {
  card_id: string
  user_id: string
  name: string
  limit_amount: number
  used_amount: number
  available_limit: number
}

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'canceled'

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  target_budget: number
  start_date: string | null
  end_date: string | null
  status: ProjectStatus
  color: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export type PropertyStatus = 'planning' | 'under_construction' | 'ready' | 'delivered'
export type AmortizationSystem = 'sac' | 'price'

export interface RealEstateProperty {
  id: string
  user_id: string
  name: string
  builder: string | null
  unit: string | null
  contract_value: number
  current_market_value: number | null
  purchase_date: string
  keys_delivery_date: string | null
  status: PropertyStatus
  down_payment_total: number
  down_payment_paid: number
  financed_amount: number
  bank: string | null
  amortization_system: AmortizationSystem
  annual_interest_rate: number
  total_term_months: number
  paid_months: number
  construction_index: string
  construction_fees_paid: number
  additional_costs_paid: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RealEstateAmortization {
  id: string
  user_id: string
  property_id: string
  amount: number
  date: string
  reduction_type: 'term' | 'installment'
  interest_saved: number | null
  term_reduced: number | null
  notes: string | null
  created_at: string
}

export type GoalPriority = 'low' | 'medium' | 'high' | 'essential'
export type GoalStatus = 'planned' | 'in_progress' | 'completed' | 'canceled'

export interface Goal {
  id: string
  user_id: string
  name: string
  brand: string | null
  priority: GoalPriority
  target_amount: number
  current_amount: number
  target_date: string | null
  account_id: string | null
  category_id: string | null
  status: GoalStatus
  purchased_amount: number | null
  purchased_date: string | null
  converted_to_asset: boolean
  asset_id: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AssetType =
  | 'real_estate'
  | 'vehicle'
  | 'electronics'
  | 'furniture'
  | 'jewelry'
  | 'other'

export interface Asset {
  id: string
  user_id: string
  name: string
  type: AssetType
  acquisition_value: number
  current_value: number
  acquisition_date: string
  goal_id: string | null
  property_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TransactionKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'investment_contribution'
  | 'investment_redemption'
  | 'card_purchase'
  | 'invoice_payment'

export type TransactionStatus = 'pending' | 'completed' | 'canceled'

export interface Transaction {
  id: string
  user_id: string
  kind: TransactionKind
  status: TransactionStatus
  description: string
  amount: number
  account_id: string | null
  to_account_id: string | null
  category_id: string | null
  card_id?: string | null
  invoice_id?: string | null
  installment_id?: string | null
  installment_number?: number | null
  project_id?: string | null
  property_id?: string | null
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

export type InvestmentType =
  | 'fixed_income'
  | 'stocks'
  | 'reits'
  | 'etf'
  | 'crypto'
  | 'funds'
  | 'pension'
  | 'other'

export type LiquidityType =
  | 'daily'
  | 'd_plus_1'
  | 'd_plus_30'
  | 'at_maturity'
  | 'locked'

export interface Investment {
  id: string
  user_id: string
  name: string
  ticker: string | null
  type: InvestmentType
  institution: string
  initial_amount: number
  total_invested: number
  current_amount: number
  start_date: string
  due_date: string | null
  liquidity: LiquidityType
  benchmark: string | null
  rate: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvestmentTxType =
  | 'contribution'
  | 'redemption'
  | 'dividend'
  | 'interest_on_equity'
  | 'yield'

export interface InvestmentTransaction {
  id: string
  user_id: string
  investment_id: string
  type: InvestmentTxType
  amount: number
  shares_quantity: number | null
  unit_price: number | null
  date: string
  account_id: string | null
  notes: string | null
  created_at: string
}

export type LiabilityType =
  | 'loan'
  | 'financing'
  | 'debt'
  | 'tax'
  | 'other'

export interface Liability {
  id: string
  user_id: string
  name: string
  type: LiabilityType
  total_amount: number
  current_balance: number
  monthly_payment: number | null
  remaining_installments: number | null
  interest_rate_monthly: number | null
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
