import { supabase } from '@/lib/supabase'
import type { CardInvoice, CreditCard, Transaction } from '@/types/database'
import { toCents, fromCents, sumCents } from '@/lib/money'

export interface InvoiceWithTotals extends CardInvoice {
  card?: CreditCard | null
  total_amount: number
  transactions_count: number
}

export async function fetchInvoices(cardId?: string): Promise<InvoiceWithTotals[]> {
  let query = supabase
    .from('card_invoices')
    .select('*')
    .order('due_date', { ascending: false })

  if (cardId) {
    query = query.eq('card_id', cardId)
  }

  const [invRes, cardsRes] = await Promise.all([
    query,
    supabase.from('credit_cards').select('*'),
  ])

  if (invRes.error) throw invRes.error
  const invoices = (invRes.data || []) as CardInvoice[]
  const cardsMap = new Map<string, CreditCard>(
    ((cardsRes.data || []) as CreditCard[]).map((c) => [c.id, c])
  )

  // Busca transações vinculadas às faturas para somar o valor total
  const invoiceIds = invoices.map((i) => i.id)
  const txsMap = new Map<string, { totalCents: number; count: number }>()

  if (invoiceIds.length > 0) {
    const { data: txs, error: txsError } = await supabase
      .from('transactions')
      .select('invoice_id, amount, status')
      .in('invoice_id', invoiceIds)

    if (!txsError && txs) {
      txs.forEach((tx) => {
        if (!tx.invoice_id || tx.status === 'canceled') return
        const curr = txsMap.get(tx.invoice_id) || { totalCents: 0, count: 0 }
        txsMap.set(tx.invoice_id, {
          totalCents: sumCents(curr.totalCents, toCents(tx.amount)),
          count: curr.count + 1,
        })
      })
    }
  }

  return invoices.map((inv) => {
    const stat = txsMap.get(inv.id) || { totalCents: 0, count: 0 }
    return {
      ...inv,
      card: cardsMap.get(inv.card_id) ?? null,
      total_amount: fromCents(stat.totalCents),
      transactions_count: stat.count,
    }
  })
}

export async function payInvoice(
  invoiceId: string,
  accountId: string,
  paidDate?: string
): Promise<Transaction> {
  const today = new Date().toISOString().split('T')[0]
  const dateToUse = paidDate || today

  // 1. Busca os dados da fatura e cartão
  const { data: invoice, error: invError } = await supabase
    .from('card_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invError || !invoice) throw invError || new Error('Fatura não encontrada')

  const { data: cardData } = await supabase
    .from('credit_cards')
    .select('name')
    .eq('id', invoice.card_id)
    .maybeSingle()

  // 2. Calcula o valor total das compras vinculadas
  const { data: txs, error: txsError } = await supabase
    .from('transactions')
    .select('amount, status')
    .eq('invoice_id', invoiceId)

  if (txsError) throw txsError

  let totalCents = 0
  ;(txs || []).forEach((t) => {
    if (t.status === 'canceled') return
    totalCents = sumCents(totalCents, toCents(t.amount))
  })
  const invoiceTotal = fromCents(totalCents)

  if (invoiceTotal <= 0) {
    throw new Error('A fatura não possui valor a ser pago.')
  }

  const cardName = cardData?.name || 'Cartão de Crédito'
  const desc = `Pagamento Fatura ${cardName} (${invoice.month}/${invoice.year})`

  // 3. Registra a transação de pagamento de fatura
  const { data: paymentTx, error: payError } = await supabase
    .from('transactions')
    .insert({
      kind: 'invoice_payment',
      status: 'completed',
      description: desc,
      amount: invoiceTotal,
      account_id: accountId,
      card_id: invoice.card_id,
      invoice_id: invoice.id,
      due_date: invoice.due_date,
      paid_date: dateToUse,
    })
    .select()
    .single()

  if (payError) throw payError

  // 4. Atualiza o status da fatura para 'paid'
  const { error: updateInvError } = await supabase
    .from('card_invoices')
    .update({
      status: 'paid',
      payment_transaction_id: paymentTx.id,
    })
    .eq('id', invoiceId)

  if (updateInvError) throw updateInvError

  return paymentTx as Transaction
}
