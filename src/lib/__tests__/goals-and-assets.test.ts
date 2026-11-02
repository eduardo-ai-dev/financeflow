import { describe, it, expect } from 'vitest'
import { goalSchema } from '@/lib/validations/goal'
import { assetSchema } from '@/lib/validations/asset'
import { toCents, fromCents, subtractCents, sumCents } from '@/lib/money'

describe('Fase 5 — Validações de Metas e Wishlist', () => {
  it('valida uma meta com campos mínimos obrigatórios válidos', () => {
    const validGoal = {
      name: 'Reserva de Emergência',
      priority: 'essential',
      target_amount: 15000,
      current_amount: 5000,
      status: 'in_progress',
    }
    const result = goalSchema.safeParse(validGoal)
    expect(result.success).toBe(true)
  })

  it('rejeita meta com valor alvo zero ou negativo', () => {
    const invalidGoal = {
      name: 'Viagem',
      priority: 'medium',
      target_amount: 0,
      current_amount: 0,
      status: 'in_progress',
    }
    const result = goalSchema.safeParse(invalidGoal)
    expect(result.success).toBe(false)
  })

  it('rejeita meta com valor atual negativo', () => {
    const invalidGoal = {
      name: 'Notebook',
      priority: 'high',
      target_amount: 8000,
      current_amount: -500,
      status: 'in_progress',
    }
    const result = goalSchema.safeParse(invalidGoal)
    expect(result.success).toBe(false)
  })

  it('rejeita meta sem nome', () => {
    const invalidGoal = {
      name: '   ',
      priority: 'low',
      target_amount: 100,
      current_amount: 0,
      status: 'planned',
    }
    const result = goalSchema.safeParse(invalidGoal)
    expect(result.success).toBe(false)
  })

  it('permite itens da Wishlist com status planned e prioridade baixa', () => {
    const wishlist = {
      name: 'Fone Bluetooth Sony XM5',
      brand: 'Sony',
      priority: 'low',
      target_amount: 2300,
      current_amount: 0,
      status: 'planned',
      notes: 'Esperar Black Friday',
    }
    const result = goalSchema.safeParse(wishlist)
    expect(result.success).toBe(true)
  })
})

describe('Fase 5 — Validações de Ativos Patrimoniais', () => {
  it('valida um ativo patrimonial cadastrado', () => {
    const validAsset = {
      name: 'MacBook Pro 16 M3 Max',
      type: 'electronics',
      acquisition_value: 18500,
      current_value: 17000,
      acquisition_date: '2026-05-10',
    }
    const result = assetSchema.safeParse(validAsset)
    expect(result.success).toBe(true)
  })

  it('rejeita ativo com data inválida', () => {
    const invalidAsset = {
      name: 'Carro',
      type: 'vehicle',
      acquisition_value: 50000,
      current_value: 48000,
      acquisition_date: '10/05/2026',
    }
    const result = assetSchema.safeParse(invalidAsset)
    expect(result.success).toBe(false)
  })
})

describe('Fase 5 — Motor Matemático de Metas e Conversão', () => {
  it('calcula progresso e valor restante sem dízimas em centavos', () => {
    const target = 10000
    const current = 3333.33

    const targetCents = toCents(target)
    const currentCents = toCents(current)
    const remainingCents = Math.max(0, subtractCents(targetCents, currentCents))
    const remaining = fromCents(remainingCents)

    expect(remaining).toBe(6666.67)
    const progressPercent = Math.min(100, Math.round((currentCents / targetCents) * 100))
    expect(progressPercent).toBe(33)
  })

  it('calcula aporte cumulativo e detecta quando a meta atinge 100%', () => {
    let currentCents = toCents(8500)
    const targetCents = toCents(10000)

    // Aporte de R$ 1500
    currentCents = sumCents(currentCents, toCents(1500))
    expect(fromCents(currentCents)).toBe(10000)
    expect(currentCents >= targetCents).toBe(true)
  })

  it('garante que valor restante não fica negativo se o aporte exceder a meta', () => {
    const currentCents = toCents(12000)
    const targetCents = toCents(10000)

    const remainingCents = Math.max(0, subtractCents(targetCents, currentCents))
    expect(remainingCents).toBe(0)
    const progressPercent = Math.min(100, Math.round((currentCents / targetCents) * 100))
    expect(progressPercent).toBe(100)
  })
})
