import { describe, it, expect } from 'vitest'
import { toCents, fromCents, sumCents, subtractCents, multiplyCents } from '../money'
import { creditCardSchema } from '../validations/card'
import {
  installmentSchema,
  encodeInstallmentNotes,
  isIncludedInCardLimit,
  cleanUserNotes,
} from '../validations/installment'

describe('Motor de Cartões de Crédito e Parcelamentos (Fase 3)', () => {
  describe('Regra 3: Regime de Competência vs. Caixa nos Cartões', () => {
    it('compra no cartão consome limite imediatamente sem debitar saldo bancário', () => {
      const limiteTotal = toCents(5000.0) // R$ 5.000,00
      let limiteUtilizado = 0
      const saldoBancarioInicial = toCents(2500.0) // R$ 2.500,00

      // Compra de R$ 800,00 no cartão
      const compraCartao = {
        kind: 'card_purchase',
        amount: toCents(800.0),
        category: 'Alimentação',
      }

      limiteUtilizado = sumCents(limiteUtilizado, compraCartao.amount)
      const limiteDisponivel = subtractCents(limiteTotal, limiteUtilizado)

      // Limite do cartão é consumido
      expect(fromCents(limiteUtilizado)).toBe(800.0)
      expect(fromCents(limiteDisponivel)).toBe(4200.0)

      // Saldo bancário permanece intocado no momento da compra (Regra 3)
      expect(fromCents(saldoBancarioInicial)).toBe(2500.0)
    })

    it('pagamento da fatura debita a conta bancária e restaura o limite sem duplicar despesa de consumo', () => {
      const limiteTotal = toCents(5000.0)
      let limiteUtilizado = toCents(800.0)
      let saldoBancario = toCents(2500.0)
      let totalDespesasConsumo = toCents(800.0) // Reconhecida na compra

      // Evento: Pagamento da Fatura
      const faturaAPagar = toCents(800.0)

      // 1. Debita o saldo bancário
      saldoBancario = subtractCents(saldoBancario, faturaAPagar)
      expect(fromCents(saldoBancario)).toBe(1700.0)

      // 2. Restaura o limite do cartão
      limiteUtilizado = subtractCents(limiteUtilizado, faturaAPagar)
      const limiteDisponivel = subtractCents(limiteTotal, limiteUtilizado)
      expect(fromCents(limiteDisponivel)).toBe(5000.0)

      // 3. Regra de Ouro: Pagamento de fatura (invoice_payment) NÃO soma como despesa de consumo
      const transacaoPagamento = {
        kind: 'invoice_payment',
        amount: faturaAPagar,
      }

      if (transacaoPagamento.kind === 'expense') {
        totalDespesasConsumo = sumCents(totalDespesasConsumo, transacaoPagamento.amount)
      }

      // Despesa total continua sendo apenas R$ 800,00 (sem duplicidade!)
      expect(fromCents(totalDespesasConsumo)).toBe(800.0)
    })
  })

  describe('Cálculos da Central de Parcelamentos', () => {
    it('calcula valor da parcela, saldo devedor restante e progresso percentual', () => {
      const totalCompra = toCents(1200.0) // R$ 1.200,00
      const totalParcelas = 12
      const valorParcela = Math.round(totalCompra / totalParcelas) // R$ 100,00

      expect(fromCents(valorParcela)).toBe(100.0)

      // Após 4 parcelas pagas
      const parcelasPagas = 4
      const parcelasRestantes = totalParcelas - parcelasPagas // 8
      const saldoDevedorRestante = multiplyCents(valorParcela, parcelasRestantes)
      const progresso = Math.round((parcelasPagas / totalParcelas) * 100)

      expect(parcelasRestantes).toBe(8)
      expect(fromCents(saldoDevedorRestante)).toBe(800.0)
      expect(progresso).toBe(33) // 33% concluído
    })
  })

  describe('Validações Zod (CreditCard, Installment)', () => {
    it('valida cartão de crédito com atributos consistentes', () => {
      const valid = creditCardSchema.safeParse({
        name: 'Nubank Ultravioleta',
        institution: 'Nubank',
        brand: 'mastercard',
        limit_amount: 15000,
        initial_used_amount: 3500,
        closing_day: 3,
        due_day: 10,
        color: '#7c3aed',
      })

      expect(valid.success).toBe(true)
    })

    it('rejeita gasto informado maior que o limite total ou negativo', () => {
      const base = {
        name: 'Inter Gold',
        brand: 'visa',
        limit_amount: 2000,
        closing_day: 5,
        due_day: 12,
        color: '#2563eb',
      }

      expect(creditCardSchema.safeParse({ ...base, initial_used_amount: 2500 }).success).toBe(false)
      expect(creditCardSchema.safeParse({ ...base, initial_used_amount: -1 }).success).toBe(false)
      expect(creditCardSchema.safeParse({ ...base, initial_used_amount: 2000 }).success).toBe(true)
      expect(creditCardSchema.safeParse({ ...base, initial_used_amount: 0 }).success).toBe(true)
    })

    it('calcula disponível = limite - gasto sem erro de ponto flutuante', () => {
      const limit = toCents(1500.1)
      const used = toCents(0.2) + toCents(700.1)
      expect(fromCents(limit - used)).toBe(799.8)
    })

    it('rejeita cartão de crédito com limite negativo ou dia inválido', () => {
      const invalid = creditCardSchema.safeParse({
        name: 'Cartão Inválido',
        brand: 'mastercard',
        limit_amount: -500,
        closing_day: 35, // inválido (> 31)
        due_day: 10,
        color: '#7c3aed',
      })

      expect(invalid.success).toBe(false)
    })

    it('valida compra parcelada', () => {
      const valid = installmentSchema.safeParse({
        description: 'Sofá Retrátil 3 Lugares',
        total_amount: 2400,
        total_installments: 10,
        start_date: '2026-11-10',
      })

      expect(valid.success).toBe(true)
    })

    it('não subtrai novamente do limite disponível quando parcelamento já está contabilizado no limite utilizado', () => {
      const limitCents = toCents(5000)
      const initialUsedCents = toCents(1800) // Já informado no cartão pelo usuário

      const encodedNotes = encodeInstallmentNotes('Compra na Amazon', true)
      expect(isIncludedInCardLimit(encodedNotes)).toBe(true)
      expect(cleanUserNotes(encodedNotes)).toBe('Compra na Amazon')

      const newPurchaseNotes = encodeInstallmentNotes('Compra nova', false)
      expect(isIncludedInCardLimit(newPurchaseNotes)).toBe(false)
      expect(cleanUserNotes(newPurchaseNotes)).toBe('Compra nova')

      const openCardTransactions = [
        { amount: 1800, notes: encodedNotes }, // Já incluso em initialUsedCents -> ignorado no limite
        { amount: 400, notes: newPurchaseNotes }, // Nova compra -> consome limite
      ]

      let openPurchasesCents = 0
      for (const tx of openCardTransactions) {
        if (!isIncludedInCardLimit(tx.notes)) {
          openPurchasesCents = sumCents(openPurchasesCents, toCents(tx.amount))
        }
      }

      const usedCents = sumCents(initialUsedCents, openPurchasesCents)
      const availableCents = subtractCents(limitCents, usedCents)

      expect(fromCents(usedCents)).toBe(2200)
      expect(fromCents(availableCents)).toBe(2800)
    })
  })
})

