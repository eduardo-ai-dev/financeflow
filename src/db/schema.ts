import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  bigserial,
  jsonb,
} from 'drizzle-orm/pg-core'

/**
 * Schema Drizzle ORM completo do FinanceFlow (Regra de Segurança 3).
 * Todas as consultas via Drizzle utilizam prepared statements / parâmetros ($1, $2...),
 * eliminando qualquer concatenação ou interpolação de strings em SQL.
 */

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  fullName: text('full_name'),
  locale: text('locale').notNull().default('pt-BR'),
  currency: text('currency').notNull().default('BRL'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  institution: text('institution'),
  type: text('type').notNull().default('checking'),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  openedOn: date('opened_on').notNull(),
  color: text('color'),
  icon: text('icon'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  parentId: uuid('parent_id'),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  icon: text('icon'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const creditCards = pgTable('credit_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  institution: text('institution'),
  brand: text('brand').notNull().default('mastercard'),
  limitAmount: numeric('limit_amount', { precision: 14, scale: 2 }).notNull(),
  initialUsedAmount: numeric('initial_used_amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  closingDay: integer('closing_day').notNull(),
  dueDay: integer('due_day').notNull(),
  color: text('color'),
  defaultAccountId: uuid('default_account_id'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const cardInvoices = pgTable('card_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cardId: uuid('card_id').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  closingDate: date('closing_date').notNull(),
  dueDate: date('due_date').notNull(),
  status: text('status').notNull().default('open'),
  paymentTransactionId: uuid('payment_transaction_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const installments = pgTable('installments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cardId: uuid('card_id'),
  accountId: uuid('account_id'),
  categoryId: uuid('category_id'),
  description: text('description').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  installmentAmount: numeric('installment_amount', { precision: 14, scale: 2 }).notNull(),
  totalInstallments: integer('total_installments').notNull(),
  startDate: date('start_date').notNull(),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  targetBudget: numeric('target_budget', { precision: 14, scale: 2 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: text('status').notNull().default('in_progress'),
  color: text('color'),
  icon: text('icon'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const realEstateProperties = pgTable('real_estate_properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  builder: text('builder'),
  unit: text('unit'),
  contractValue: numeric('contract_value', { precision: 14, scale: 2 }).notNull(),
  currentMarketValue: numeric('current_market_value', { precision: 14, scale: 2 }),
  purchaseDate: date('purchase_date').notNull(),
  keysDeliveryDate: date('keys_delivery_date'),
  status: text('status').notNull().default('under_construction'),
  downPaymentTotal: numeric('down_payment_total', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  downPaymentPaid: numeric('down_payment_paid', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  financedAmount: numeric('financed_amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  bank: text('bank'),
  amortizationSystem: text('amortization_system').notNull().default('sac'),
  annualInterestRate: numeric('annual_interest_rate', { precision: 6, scale: 4 })
    .notNull()
    .default('0.0950'),
  totalTermMonths: integer('total_term_months').notNull().default(360),
  paidMonths: integer('paid_months').notNull().default(0),
  constructionIndex: text('construction_index').notNull().default('INCC'),
  constructionFeesPaid: numeric('construction_fees_paid', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  additionalCostsPaid: numeric('additional_costs_paid', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const realEstateAmortizations = pgTable('real_estate_amortizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  propertyId: uuid('property_id').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  date: date('date').notNull(),
  reductionType: text('reduction_type').notNull(),
  interestSaved: numeric('interest_saved', { precision: 14, scale: 2 }).default('0'),
  termReduced: integer('term_reduced').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  brand: text('brand'),
  priority: text('priority').notNull().default('medium'),
  targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  targetDate: date('target_date'),
  accountId: uuid('account_id'),
  categoryId: uuid('category_id'),
  status: text('status').notNull().default('in_progress'),
  purchasedAmount: numeric('purchased_amount', { precision: 14, scale: 2 }),
  purchasedDate: date('purchased_date'),
  convertedToAsset: boolean('converted_to_asset').notNull().default(false),
  assetId: uuid('asset_id'),
  imageUrl: text('image_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('electronics'),
  acquisitionValue: numeric('acquisition_value', { precision: 14, scale: 2 }).notNull(),
  currentValue: numeric('current_value', { precision: 14, scale: 2 }).notNull(),
  acquisitionDate: date('acquisition_date').notNull(),
  goalId: uuid('goal_id'),
  propertyId: uuid('property_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const investments = pgTable('investments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  ticker: text('ticker'),
  type: text('type').notNull().default('fixed_income'),
  institution: text('institution').notNull(),
  initialAmount: numeric('initial_amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  totalInvested: numeric('total_invested', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  currentAmount: numeric('current_amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  startDate: date('start_date').notNull(),
  dueDate: date('due_date'),
  liquidity: text('liquidity').notNull().default('daily'),
  benchmark: text('benchmark'),
  rate: text('rate'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const investmentTransactions = pgTable('investment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  investmentId: uuid('investment_id').notNull(),
  type: text('type').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  sharesQuantity: numeric('shares_quantity', { precision: 14, scale: 4 }),
  unitPrice: numeric('unit_price', { precision: 14, scale: 4 }),
  date: date('date').notNull(),
  accountId: uuid('account_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const liabilities = pgTable('liabilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('loan'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  currentBalance: numeric('current_balance', { precision: 14, scale: 2 }).notNull(),
  monthlyPayment: numeric('monthly_payment', { precision: 14, scale: 2 }),
  remainingInstallments: integer('remaining_installments'),
  interestRateMonthly: numeric('interest_rate_monthly', { precision: 6, scale: 4 }),
  dueDate: date('due_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('completed'),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  accountId: uuid('account_id'),
  toAccountId: uuid('to_account_id'),
  categoryId: uuid('category_id'),
  expenseClassification: text('expense_classification'),
  cardId: uuid('card_id'),
  invoiceId: uuid('invoice_id'),
  installmentId: uuid('installment_id'),
  installmentNumber: integer('installment_number'),
  projectId: uuid('project_id'),
  propertyId: uuid('property_id'),
  dueDate: date('due_date').notNull(),
  paidDate: date('paid_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id'),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id'),
  action: text('action').notNull(),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
