import { supabase } from '@/lib/supabase'
import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export interface DashboardMetrics {
  /** Patrimônio líquido calculado (Ativos - Passivos). Na Fase 1: saldo total em contas */
  netWorth: number
  /** Saldo total consolidado em todas as contas ativas */
  totalBalance: number
  /** Dinheiro disponível para uso imediato (conta corrente, digital, espécie, carteira) */
  immediateLiquidity: number
  /** Total de receitas efetivadas no mês corrente */
  monthlyIncome: number
  /** Total de despesas efetivadas no mês corrente */
  monthlyExpenses: number
  /** Saldo mensal (Receitas - Despesas do mês) */
  monthlyBalance: number
  /** Despesas pendentes com vencimento no mês corrente */
  pendingExpenses: number
  /** Receitas pendentes a receber no mês corrente */
  pendingIncome: number
  /** Quantidade de contas ativas cadastradas */
  accountsCount: number
  /** Quantidade de transações no mês */
  transactionsCount: number
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date()
  const firstDay = format(startOfMonth(now), 'yyyy-MM-dd')
  const lastDay = format(endOfMonth(now), 'yyyy-MM-dd')

  // 1. Busca saldos calculados pela view account_balances e contas ativas
  const [balancesResponse, accountsResponse, transactionsResponse] = await Promise.all([
    supabase.from('account_balances').select('*'),
    supabase.from('accounts').select('id, type, is_archived').eq('is_archived', false),
    supabase
      .from('transactions')
      .select('kind, status, amount, due_date, paid_date')
      .gte('due_date', firstDay)
      .lte('due_date', lastDay),
  ])

  if (balancesResponse.error) throw balancesResponse.error
  if (accountsResponse.error) throw accountsResponse.error
  if (transactionsResponse.error) throw transactionsResponse.error

  const balances = balancesResponse.data || []
  const accounts = accountsResponse.data || []
  const transactions = transactionsResponse.data || []

  // Mapa de contas ativas e seus tipos
  const activeAccountsMap = new Map<string, string>()
  accounts.forEach((acc) => {
    activeAccountsMap.set(acc.id, acc.type)
  })

  // Contas que representam liquidez imediata (uso no dia a dia)
  const liquidityTypes = new Set(['checking', 'savings', 'digital', 'cash', 'wallet'])

  let totalBalanceCents = 0
  let immediateLiquidityCents = 0

  balances.forEach((b) => {
    // Considera apenas contas que estão ativas
    if (activeAccountsMap.has(b.account_id)) {
      const currentCents = toCents(b.current_balance)
      totalBalanceCents = sumCents(totalBalanceCents, currentCents)

      const accountType = activeAccountsMap.get(b.account_id)
      if (accountType && liquidityTypes.has(accountType)) {
        immediateLiquidityCents = sumCents(immediateLiquidityCents, currentCents)
      }
    }
  })

  // 2. Calcula receitas e despesas do mês corrente em centavos
  let monthlyIncomeCents = 0
  let monthlyExpensesCents = 0
  let pendingExpensesCents = 0
  let pendingIncomeCents = 0

  transactions.forEach((tx) => {
    const amountCents = toCents(tx.amount)

    if (tx.kind === 'income') {
      if (tx.status === 'completed') {
        monthlyIncomeCents = sumCents(monthlyIncomeCents, amountCents)
      } else if (tx.status === 'pending') {
        pendingIncomeCents = sumCents(pendingIncomeCents, amountCents)
      }
    } else if (tx.kind === 'expense') {
      if (tx.status === 'completed') {
        monthlyExpensesCents = sumCents(monthlyExpensesCents, amountCents)
      } else if (tx.status === 'pending') {
        pendingExpensesCents = sumCents(pendingExpensesCents, amountCents)
      }
    }
    // Nota: 'transfer', 'investment_contribution' etc. são neutros contábeis (Regras 2 e 4)
  })

  const monthlyBalanceCents = subtractCents(monthlyIncomeCents, monthlyExpensesCents)

  return {
    netWorth: fromCents(totalBalanceCents),
    totalBalance: fromCents(totalBalanceCents),
    immediateLiquidity: fromCents(immediateLiquidityCents),
    monthlyIncome: fromCents(monthlyIncomeCents),
    monthlyExpenses: fromCents(monthlyExpensesCents),
    monthlyBalance: fromCents(monthlyBalanceCents),
    pendingExpenses: fromCents(pendingExpensesCents),
    pendingIncome: fromCents(pendingIncomeCents),
    accountsCount: accounts.length,
    transactionsCount: transactions.length,
  }
}

