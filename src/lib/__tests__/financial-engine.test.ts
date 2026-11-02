import { describe, it, expect } from 'vitest'
import { toCents, fromCents, sumCents, subtractCents } from '../money'
import { accountSchema } from '../validations/account'
import { categorySchema } from '../validations/category'
import { transactionSchema } from '../validations/transaction'

describe('Motor Financeiro & Regras de Negócio (Fase 2)', () => {
  describe('Regra 2: Neutralidade Contábil de Transferências', () => {
    it('deve debitar da conta origem e creditar na destino mantendo o saldo consolidado inalterado', () => {
      const contaA_inicial = toCents(1000.0) // R$ 1.000,00
      const contaB_inicial = toCents(200.0) // R$ 200,00
      const valorTransferencia = toCents(350.0) // R$ 350,00

      // Movimentação da transferência
      const contaA_final = subtractCents(contaA_inicial, valorTransferencia)
      const contaB_final = sumCents(contaB_inicial, valorTransferencia)

      expect(fromCents(contaA_final)).toBe(650.0)
      expect(fromCents(contaB_final)).toBe(550.0)

      // Saldo consolidado total antes e depois deve ser rigorosamente idêntico
      const saldoTotalAntes = sumCents(contaA_inicial, contaB_inicial)
      const saldoTotalDepois = sumCents(contaA_final, contaB_final)

      expect(saldoTotalDepois).toBe(saldoTotalAntes)
      expect(fromCents(saldoTotalDepois)).toBe(1200.0)
    })

    it('transferências não alteram receitas nem despesas de consumo', () => {
      let receitaMensal = toCents(5000.0)
      let despesaMensal = toCents(3000.0)

      const transacaoTransferencia = {
        kind: 'transfer',
        amount: toCents(1000.0),
      }

      // Motor contábil ignora transações onde kind !== 'income' e kind !== 'expense'
      if (transacaoTransferencia.kind === 'income') {
        receitaMensal = sumCents(receitaMensal, transacaoTransferencia.amount)
      } else if (transacaoTransferencia.kind === 'expense') {
        despesaMensal = sumCents(despesaMensal, transacaoTransferencia.amount)
      }

      expect(fromCents(receitaMensal)).toBe(5000.0)
      expect(fromCents(despesaMensal)).toBe(3000.0)
    })
  })

  describe('Cálculo da Taxa de Poupança (Savings Rate)', () => {
    function calculateSavingsRate(income: number, expense: number): number {
      if (income <= 0) return 0
      return Math.round(((income - expense) / income) * 100)
    }

    it('calcula taxa de poupança positiva corretamente', () => {
      expect(calculateSavingsRate(5000, 3000)).toBe(40) // Poupança de 40%
      expect(calculateSavingsRate(10000, 8000)).toBe(20) // Poupança de 20%
    })

    it('calcula taxa de poupança nula ou negativa para orçamentos deficitários', () => {
      expect(calculateSavingsRate(5000, 5000)).toBe(0)
      expect(calculateSavingsRate(4000, 5000)).toBe(-25)
      expect(calculateSavingsRate(0, 1000)).toBe(0)
    })
  })

  describe('Validações Zod (Account, Category, Transaction)', () => {
    it('valida conta financeira corretamente', () => {
      const valid = accountSchema.safeParse({
        name: 'Nubank Principal',
        type: 'digital',
        opening_balance: 1500,
        color: '#10b981',
      })
      expect(valid.success).toBe(true)

      const invalid = accountSchema.safeParse({
        name: '',
        type: 'invalido',
      })
      expect(invalid.success).toBe(false)
    })

    it('valida categoria financeira corretamente', () => {
      const validExpense = categorySchema.safeParse({
        name: 'Alimentação',
        kind: 'expense',
        color: '#f59e0b',
        icon: 'Utensils',
      })
      expect(validExpense.success).toBe(true)

      const validIncome = categorySchema.safeParse({
        name: 'Salário',
        kind: 'income',
        color: '#10b981',
        icon: 'Briefcase',
      })
      expect(validIncome.success).toBe(true)
    })

    it('impede transferência com mesma conta de origem e destino', () => {
      const sameAccountUuid = 'a0000000-0000-4000-8000-000000000001'
      const invalidTransfer = transactionSchema.safeParse({
        kind: 'transfer',
        description: 'Transferência inválida para mesma conta',
        amount: 100,
        account_id: sameAccountUuid,
        to_account_id: sameAccountUuid,
        status: 'completed',
        due_date: '2026-11-05',
      })

      expect(invalidTransfer.success).toBe(false)
      if (!invalidTransfer.success) {
        expect(invalidTransfer.error.issues[0].message).toContain('diferente')
      }
    })

    it('aceita transferência com contas de origem e destino distintas', () => {
      const validTransfer = transactionSchema.safeParse({
        kind: 'transfer',
        description: 'Transferência Nubank para Carteira',
        amount: 250,
        account_id: 'a0000000-0000-4000-8000-000000000001',
        to_account_id: 'b0000000-0000-4000-8000-000000000002',
        status: 'completed',
        due_date: '2026-11-05',
        paid_date: '2026-11-05',
      })

      expect(validTransfer.success).toBe(true)
    })

    it('valida classificação de despesa (Fixo, Variável, Eventual, Extraordinário)', () => {
      const validFixedExpense = transactionSchema.safeParse({
        kind: 'expense',
        description: 'Aluguel Mensal',
        amount: 2200,
        account_id: 'a0000000-0000-4000-8000-000000000001',
        expense_classification: 'fixed',
        status: 'completed',
        due_date: '2026-11-05',
      })
      expect(validFixedExpense.success).toBe(true)

      const invalidClassification = transactionSchema.safeParse({
        kind: 'expense',
        description: 'Gasto inválido',
        amount: 100,
        account_id: 'a0000000-0000-4000-8000-000000000001',
        expense_classification: 'inexistente',
        status: 'completed',
        due_date: '2026-11-05',
      })
      expect(invalidClassification.success).toBe(false)
    })
  })
})
