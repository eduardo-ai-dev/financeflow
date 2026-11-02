import { supabase } from '@/lib/supabase'
import type { Investment, InvestmentTransaction } from '@/types/database'
import type { InvestmentFormData, InvestmentTxFormData } from '@/lib/validations/investment'
import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'

export interface InvestmentWithStats extends Investment {
  profit_amount: number // Lucro/prejuízo em R$
  profit_percent: number // Rentabilidade percentual
}

export async function fetchInvestments(): Promise<InvestmentWithStats[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('current_amount', { ascending: false })

  if (error) throw error
  const list = (data || []) as Investment[]

  return list.map((inv) => {
    const curCents = toCents(inv.current_amount)
    const costCents = toCents(inv.total_invested)
    const profitCents = subtractCents(curCents, costCents)
    const profitAmount = fromCents(profitCents)

    const profitPercent =
      costCents > 0
        ? Math.round((profitAmount / inv.total_invested) * 10000) / 100
        : 0

    return {
      ...inv,
      profit_amount: profitAmount,
      profit_percent: profitPercent,
    }
  })
}

export async function createInvestment(data: InvestmentFormData): Promise<Investment> {
  const { data: created, error } = await supabase
    .from('investments')
    .insert({
      name: data.name.trim(),
      ticker: data.ticker?.trim() ? data.ticker.trim().toUpperCase() : null,
      type: data.type,
      institution: data.institution.trim(),
      initial_amount: data.initial_amount,
      total_invested: data.total_invested || data.initial_amount,
      current_amount: data.current_amount || data.initial_amount,
      start_date: data.start_date,
      due_date: data.due_date || null,
      liquidity: data.liquidity,
      benchmark: data.benchmark?.trim() || null,
      rate: data.rate?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as Investment
}

export async function updateInvestment(
  id: string,
  data: Partial<InvestmentFormData>
): Promise<Investment> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.ticker !== undefined)
    payload.ticker = data.ticker?.trim() ? data.ticker.trim().toUpperCase() : null
  if (data.type !== undefined) payload.type = data.type
  if (data.institution !== undefined) payload.institution = data.institution.trim()
  if (data.initial_amount !== undefined) payload.initial_amount = data.initial_amount
  if (data.total_invested !== undefined) payload.total_invested = data.total_invested
  if (data.current_amount !== undefined) payload.current_amount = data.current_amount
  if (data.start_date !== undefined) payload.start_date = data.start_date
  if (data.due_date !== undefined) payload.due_date = data.due_date || null
  if (data.liquidity !== undefined) payload.liquidity = data.liquidity
  if (data.benchmark !== undefined) payload.benchmark = data.benchmark?.trim() || null
  if (data.rate !== undefined) payload.rate = data.rate?.trim() || null
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null

  const { data: updated, error } = await supabase
    .from('investments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Investment
}

export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) throw error
}

export async function fetchInvestmentTransactions(
  investmentId?: string
): Promise<InvestmentTransaction[]> {
  let query = supabase
    .from('investment_transactions')
    .select('*')
    .order('date', { ascending: false })

  if (investmentId) {
    query = query.eq('investment_id', investmentId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as InvestmentTransaction[]
}

export async function addInvestmentTransaction(
  data: InvestmentTxFormData
): Promise<InvestmentTransaction> {
  // 1. Inserir a movimentação de investimento
  const { data: tx, error: txError } = await supabase
    .from('investment_transactions')
    .insert({
      investment_id: data.investment_id,
      type: data.type,
      amount: data.amount,
      shares_quantity: data.shares_quantity || null,
      unit_price: data.unit_price || null,
      date: data.date,
      account_id: data.account_id || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (txError) throw txError

  // 2. Buscar o investimento para atualizar seu saldo e total investido
  const { data: inv, error: invFetchError } = await supabase
    .from('investments')
    .select('name, total_invested, current_amount')
    .eq('id', data.investment_id)
    .single()

  if (!invFetchError && inv) {
    let newInvestedCents = toCents(inv.total_invested)
    let newCurrentCents = toCents(inv.current_amount)
    const amountCents = toCents(data.amount)

    if (data.type === 'contribution') {
      newInvestedCents = sumCents(newInvestedCents, amountCents)
      newCurrentCents = sumCents(newCurrentCents, amountCents)
    } else if (data.type === 'redemption') {
      newCurrentCents = Math.max(0, subtractCents(newCurrentCents, amountCents))
      newInvestedCents = Math.max(0, subtractCents(newInvestedCents, amountCents))
    } else if (data.type === 'yield' || data.type === 'dividend') {
      // Rendimento acumulado
      newCurrentCents = sumCents(newCurrentCents, amountCents)
    }

    await supabase
      .from('investments')
      .update({
        total_invested: fromCents(newInvestedCents),
        current_amount: fromCents(newCurrentCents),
      })
      .eq('id', data.investment_id)

    // 3. Regra de Negócio 4: Vínculo bancário neutro de fluxo de caixa
    if (data.account_id) {
      if (data.type === 'contribution') {
        // Aporte: sai do banco como investimento (NÃO despesa de consumo!)
        await supabase.from('transactions').insert({
          kind: 'investment_contribution',
          status: 'completed',
          description: `Aporte em Investimento: ${inv.name}`,
          amount: data.amount,
          account_id: data.account_id,
          due_date: data.date,
          paid_date: data.date,
          notes: 'Transferência de liquidez imediata para liquidez investida (patrimônio neutro).',
        })
      } else if (data.type === 'redemption') {
        // Resgate: entra no banco como resgate (NÃO receita de trabalho/salário!)
        await supabase.from('transactions').insert({
          kind: 'investment_redemption',
          status: 'completed',
          description: `Resgate de Investimento: ${inv.name}`,
          amount: data.amount,
          account_id: data.account_id,
          due_date: data.date,
          paid_date: data.date,
          notes: 'Retorno de capital investido para o caixa bancário.',
        })
      }
    }
  }

  return tx as InvestmentTransaction
}
