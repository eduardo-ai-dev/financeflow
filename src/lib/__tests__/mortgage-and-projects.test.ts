import { describe, it, expect } from 'vitest'
import { calculateSac, calculatePrice, simulateAmortization } from '../mortgage'
import { projectSchema } from '../validations/project'
import { realEstatePropertySchema } from '../validations/property'

describe('Motor Imobiliário & Projetos (Fase 4)', () => {
  describe('Sistema de Amortização Constante (SAC)', () => {
    it('mantém amortização mensal constante e prestações estritamente decrescentes', () => {
      const financiado = 240000 // R$ 240.000,00
      const taxaAnual = 0.095 // 9.5% a.a.
      const prazo = 360 // 360 meses

      const resultado = calculateSac(financiado, taxaAnual, prazo)

      expect(resultado.system).toBe('sac')
      expect(resultado.totalMonths).toBe(360)

      // Primeira parcela maior que a última
      expect(resultado.initialInstallment).toBeGreaterThan(resultado.finalInstallment)

      // Amortização constante (240.000 / 360 = ~666,67)
      const primeiraAmortizacao = resultado.schedule[0].amortization
      const segundaAmortizacao = resultado.schedule[1].amortization
      expect(Math.abs(primeiraAmortizacao - segundaAmortizacao)).toBeLessThanOrEqual(0.01)

      // Saldo devedor final após 360 meses deve ser 0
      const ultimoMes = resultado.schedule[359]
      expect(ultimoMes.remainingBalance).toBe(0)

      // Total pago = financiado + juros
      expect(resultado.totalAmountPaid).toBeCloseTo(
        financiado + resultado.totalInterestPaid,
        1
      )
    })
  })

  describe('Tabela Price (Sistema Francês)', () => {
    it('mantém prestações constantes e amortizações estritamente crescentes', () => {
      const financiado = 200000 // R$ 200.000,00
      const taxaAnual = 0.10 // 10% a.a.
      const prazo = 240 // 240 meses

      const resultado = calculatePrice(financiado, taxaAnual, prazo)

      expect(resultado.system).toBe('price')
      expect(resultado.initialInstallment).toBe(resultado.finalInstallment)

      // Amortização cresce ao longo dos meses
      const amortMes1 = resultado.schedule[0].amortization
      const amortMes100 = resultado.schedule[99].amortization
      expect(amortMes100).toBeGreaterThan(amortMes1)

      // Saldo devedor zerado no final
      expect(resultado.schedule[239].remainingBalance).toBe(0)
    })
  })

  describe('Simulador de Amortização Extraordinária (Prazo vs. Parcela)', () => {
    it('redução de prazo economiza significativamente mais juros do que redução de parcela', () => {
      const saldoDevedor = 180000 // R$ 180.000,00
      const taxaAnual = 0.095
      const mesesRestantes = 300
      const aporteExtra = 20000 // R$ 20.000,00

      const simPrazo = simulateAmortization(
        saldoDevedor,
        taxaAnual,
        mesesRestantes,
        aporteExtra,
        'term',
        'sac'
      )

      const simParcela = simulateAmortization(
        saldoDevedor,
        taxaAnual,
        mesesRestantes,
        aporteExtra,
        'installment',
        'sac'
      )

      // Redução de prazo elimina meses
      expect(simPrazo.monthsSaved).toBeGreaterThan(0)
      expect(simPrazo.newMonthsRemaining).toBeLessThan(mesesRestantes)

      // Redução de parcela preserva prazo e diminui a prestação
      expect(simParcela.monthsSaved).toBe(0)
      expect(simParcela.newInstallment).toBeLessThan(simParcela.oldInstallment)

      // Verdade matemática dos financiamentos: Reduzir prazo gera maior economia total de juros
      expect(simPrazo.interestSaved).toBeGreaterThan(simParcela.interestSaved)
    })
  })

  describe('Validações Zod (Projetos e Imóveis)', () => {
    it('valida formulário de projeto independente', () => {
      const valid = projectSchema.safeParse({
        name: 'Reforma da Cozinha Planejada',
        target_budget: 35000,
        status: 'in_progress',
        color: '#3b82f6',
        icon: 'FolderKanban',
      })

      expect(valid.success).toBe(true)
    })

    it('valida formulário de imóvel com financiamento', () => {
      const valid = realEstatePropertySchema.safeParse({
        name: 'Residencial Alto da Serra - Apto 302',
        contract_value: 450000,
        purchase_date: '2026-05-15',
        status: 'under_construction',
        down_payment_total: 90000,
        down_payment_paid: 30000,
        financed_amount: 360000,
        amortization_system: 'sac',
        annual_interest_rate: 0.095,
        total_term_months: 360,
        paid_months: 0,
        construction_index: 'INCC',
        construction_fees_paid: 0,
        additional_costs_paid: 0,
      })

      expect(valid.success).toBe(true)
    })
  })
})

