import { describe, it, expect } from 'vitest'
import {
  toValidDate,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatRelativeDate,
} from '@/lib/date'

describe('date utilities', () => {
  describe('toValidDate', () => {
    it('parseia string simples AAAA-MM-DD sem recuo de fuso horário', () => {
      const date = toValidDate('2026-11-05')
      expect(date).not.toBeNull()
      expect(date?.getFullYear()).toBe(2026)
      expect(date?.getMonth()).toBe(10) // Novembro = 10 (0-indexed)
      expect(date?.getDate()).toBe(5)
    })

    it('aceita instâncias de Date', () => {
      const d = new Date(2026, 0, 15)
      expect(toValidDate(d)).toEqual(d)
    })

    it('aceita timestamp numérico', () => {
      const ts = 1700000000000
      const d = toValidDate(ts)
      expect(d?.getTime()).toBe(ts)
    })

    it('retorna null para valores inválidos, vazios ou nulos', () => {
      expect(toValidDate(null)).toBeNull()
      expect(toValidDate(undefined)).toBeNull()
      expect(toValidDate('')).toBeNull()
      expect(toValidDate('data-invalida')).toBeNull()
    })
  })

  describe('formatDate', () => {
    it('formata data no padrão brasileiro DD/MM/AAAA', () => {
      expect(formatDate('2026-11-05')).toBe('05/11/2026')
      expect(formatDate('2026-01-01')).toBe('01/01/2026')
      expect(formatDate('2026-12-31')).toBe('31/12/2026')
    })

    it('retorna fallback padrão (-) para entradas inválidas', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
      expect(formatDate('')).toBe('-')
      expect(formatDate('abc')).toBe('-')
    })

    it('suporta fallback customizado', () => {
      expect(formatDate(null, 'Sem data')).toBe('Sem data')
    })
  })

  describe('formatDateTime', () => {
    it('formata data e hora no padrão DD/MM/AAAA às HH:mm', () => {
      const d = new Date(2026, 10, 5, 14, 30)
      expect(formatDateTime(d)).toBe('05/11/2026 às 14:30')
    })

    it('retorna fallback para entrada inválida', () => {
      expect(formatDateTime(null)).toBe('-')
    })
  })

  describe('formatMonthYear', () => {
    it('formata mês e ano por extenso em português', () => {
      expect(formatMonthYear('2026-11-05')).toBe('Novembro 2026')
      expect(formatMonthYear('2026-03-10')).toBe('Março 2026')
    })
  })

  describe('formatRelativeDate', () => {
    it('retorna "Hoje" para a data atual', () => {
      expect(formatRelativeDate(new Date())).toBe('Hoje')
    })

    it('retorna "Ontem" para a data de ontem', () => {
      const ontem = new Date()
      ontem.setDate(ontem.getDate() - 1)
      expect(formatRelativeDate(ontem)).toBe('Ontem')
    })

    it('retorna "Amanhã" para a data de amanhã', () => {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      expect(formatRelativeDate(amanha)).toBe('Amanhã')
    })

    it('retorna DD/MM/AAAA para outras datas', () => {
      expect(formatRelativeDate('2025-05-10')).toBe('10/05/2025')
    })
  })
})

