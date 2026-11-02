import { describe, it, expect } from 'vitest'
import {
  toCents,
  fromCents,
  formatBRL,
  sumCents,
  subtractCents,
  multiplyCents,
  calcPercentage,
} from '@/lib/money'

describe('money utilities', () => {
  describe('toCents', () => {
    it('converte reais para centavos inteiros', () => {
      expect(toCents(10)).toBe(1000)
      expect(toCents(12.34)).toBe(1234)
      expect(toCents(0.05)).toBe(5)
      expect(toCents(0.01)).toBe(1)
    })

    it('arredonda corretamente dizimas flutuantes (0.1 + 0.2)', () => {
      // No JS puro, 0.1 + 0.2 = 0.30000000000000004
      const sum = 0.1 + 0.2
      expect(toCents(sum)).toBe(30)
    })

    it('trata valores negativos', () => {
      expect(toCents(-50.25)).toBe(-5025)
    })

    it('trata valores nulos, indefinidos ou NaN retornando 0', () => {
      expect(toCents(null)).toBe(0)
      expect(toCents(undefined)).toBe(0)
      expect(toCents(Number.NaN)).toBe(0)
      expect(toCents(0)).toBe(0)
    })
  })

  describe('fromCents', () => {
    it('converte centavos inteiros para reais decimais', () => {
      expect(fromCents(1000)).toBe(10)
      expect(fromCents(1234)).toBe(12.34)
      expect(fromCents(5)).toBe(0.05)
      expect(fromCents(1)).toBe(0.01)
      expect(fromCents(-5025)).toBe(-50.25)
    })

    it('trata nulos, indefinidos ou NaN retornando 0', () => {
      expect(fromCents(null)).toBe(0)
      expect(fromCents(undefined)).toBe(0)
      expect(fromCents(Number.NaN)).toBe(0)
    })
  })

  describe('formatBRL', () => {
    it('formata valores monetários no padrão brasileiro R$', () => {
      // Normaliza espaço não quebrável (\u00a0 ou \u202f) do Intl
      const result = formatBRL(1234.56).replace(/\s/g, ' ')
      expect(result).toBe('R$ 1.234,56')
    })

    it('formata zero corretamente', () => {
      const result = formatBRL(0).replace(/\s/g, ' ')
      expect(result).toBe('R$ 0,00')
    })

    it('trata nulos, indefinidos e NaN como R$ 0,00', () => {
      expect(formatBRL(null).replace(/\s/g, ' ')).toBe('R$ 0,00')
      expect(formatBRL(undefined).replace(/\s/g, ' ')).toBe('R$ 0,00')
      expect(formatBRL(Number.NaN).replace(/\s/g, ' ')).toBe('R$ 0,00')
    })

    it('formata a partir de centavos com a flag fromCents', () => {
      const result = formatBRL(54321, { fromCents: true }).replace(/\s/g, ' ')
      expect(result).toBe('R$ 543,21')
    })

    it('exibe sinal explícito com a flag showSign', () => {
      const pos = formatBRL(100, { showSign: true }).replace(/\s/g, ' ')
      expect(pos).toBe('+ R$ 100,00')

      const neg = formatBRL(-100, { showSign: true }).replace(/\s/g, ' ')
      expect(neg).toBe('− R$ 100,00')

      const zero = formatBRL(0, { showSign: true }).replace(/\s/g, ' ')
      expect(zero).toBe('R$ 0,00')
    })

    it('formata valores negativos com traço semântico sem showSign', () => {
      const neg = formatBRL(-250.75).replace(/\s/g, ' ')
      expect(neg).toBe('− R$ 250,75')
    })

    it('suporta notação compacta para dashboards', () => {
      const compact = formatBRL(15000, { compact: true }).replace(/\s/g, ' ')
      expect(compact).toMatch(/R\$\s*15/)
    })
  })

  describe('operações com centavos', () => {
    it('sumCents soma múltiplos valores sem erros flutuantes', () => {
      expect(sumCents(100, 250, 50)).toBe(400)
      expect(sumCents(10, null, 20, undefined, 30)).toBe(60)
      expect(sumCents()).toBe(0)
    })

    it('subtractCents subtrai com precisão', () => {
      expect(subtractCents(1000, 350)).toBe(650)
      expect(subtractCents(500, 700)).toBe(-200)
    })

    it('multiplyCents multiplica por taxa escalar com arredondamento seguro', () => {
      expect(multiplyCents(1000, 1.05)).toBe(1050)
      expect(multiplyCents(333, 3)).toBe(999)
    })

    it('calcPercentage calcula percentual exato', () => {
      expect(calcPercentage(50, 100)).toBe(50)
      expect(calcPercentage(1, 3)).toBe(33.3)
      expect(calcPercentage(250, 1000)).toBe(25)
      expect(calcPercentage(100, 0)).toBe(0)
    })
  })
})

