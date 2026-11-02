import { format, parseISO, isValid, isToday, isYesterday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type DateInput = string | Date | number | null | undefined

/**
 * Converte qualquer entrada de data suportada em objeto Date válido.
 * Trata datas ISO no formato "AAAA-MM-DD" para evitar distorção de fuso horário.
 */
export function toValidDate(input: DateInput): Date | null {
  if (!input) return null

  if (input instanceof Date) {
    return isValid(input) ? input : null
  }

  if (typeof input === 'number') {
    const d = new Date(input)
    return isValid(d) ? d : null
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null

    // Caso seja apenas "AAAA-MM-DD", parseia como data local para evitar recuo de fuso UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number)
      const localDate = new Date(year, month - 1, day)
      return isValid(localDate) ? localDate : null
    }

    try {
      const parsed = parseISO(trimmed)
      if (isValid(parsed)) return parsed
    } catch {
      // Tenta fallback com Date constructor
    }

    const fallback = new Date(trimmed)
    return isValid(fallback) ? fallback : null
  }

  return null
}

/**
 * Formata data no formato padrão brasileiro oficial (DD/MM/AAAA).
 * Exemplo: "2026-11-05" -> "05/11/2026"
 */
export function formatDate(input: DateInput, fallback = '-'): string {
  const date = toValidDate(input)
  if (!date) return fallback

  try {
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return fallback
  }
}

/**
 * Formata data e hora no formato brasileiro (DD/MM/AAAA às HH:mm).
 */
export function formatDateTime(input: DateInput, fallback = '-'): string {
  const date = toValidDate(input)
  if (!date) return fallback

  try {
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return fallback
  }
}

/**
 * Formata mês e ano por extenso em português.
 * Exemplo: "2026-11-05" -> "Novembro de 2026"
 */
export function formatMonthYear(input: DateInput, fallback = '-'): string {
  const date = toValidDate(input)
  if (!date) return fallback

  try {
    const formatted = format(date, 'MMMM yyyy', { locale: ptBR })
    // Capitaliza a primeira letra do mês
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  } catch {
    return fallback
  }
}

/**
 * Retorna representação amigável ou relativa para vencimentos e transações recentes.
 * Exemplos: "Hoje", "Ontem", "Amanhã" ou "DD/MM/AAAA".
 */
export function formatRelativeDate(input: DateInput, fallback = '-'): string {
  const date = toValidDate(input)
  if (!date) return fallback

  if (isToday(date)) return 'Hoje'
  if (isYesterday(date)) return 'Ontem'
  if (isTomorrow(date)) return 'Amanhã'

  return formatDate(date, fallback)
}

export function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

