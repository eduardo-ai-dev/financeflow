/**
 * Utilitários para cálculos monetários e formatação em Real brasileiro (BRL).
 * 
 * Regra contábil fundamental (README):
 * Todos os cálculos no front-end devem operar sobre CENTAVOS INTEIROS (integers)
 * para evitar erros de imprecisão de ponto flutuante do padrão IEEE 754.
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const brlCompactFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Converte valor decimal em Reais para centavos inteiros.
 * Exemplo: 12.34 -> 1234
 */
export function toCents(reais: number | null | undefined): number {
  if (reais === null || reais === undefined || Number.isNaN(reais)) {
    return 0
  }
  return Math.round(reais * 100)
}

/**
 * Converte valor em centavos inteiros para decimal em Reais.
 * Exemplo: 1234 -> 12.34
 */
export function fromCents(cents: number | null | undefined): number {
  if (cents === null || cents === undefined || Number.isNaN(cents)) {
    return 0
  }
  return cents / 100
}

export interface FormatBRLOptions {
  /** Se true, o valor recebido já é em centavos e será dividido por 100 */
  fromCents?: boolean
  /** Se true, exibe o sinal de positivo (+) para valores maiores que zero */
  showSign?: boolean
  /** Se true, usa notação compacta (ex: R$ 1,5 mil) para dashboards e cards resumidos */
  compact?: boolean
}

/**
 * Formata um valor numérico no padrão monetário oficial brasileiro (R$).
 * 
 * Exemplos:
 *  formatBRL(1234.5) -> "R$ 1.234,50"
 *  formatBRL(123450, { fromCents: true }) -> "R$ 1.234,50"
 *  formatBRL(1234.5, { showSign: true }) -> "+ R$ 1.234,50"
 *  formatBRL(-1234.5, { showSign: true }) -> "− R$ 1.234,50"
 */
export function formatBRL(amount: number | null | undefined, options: FormatBRLOptions = {}): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return brlFormatter.format(0)
  }

  const rawValue = options.fromCents ? fromCents(amount) : amount
  const isPositive = rawValue > 0
  const isNegative = rawValue < 0
  const absoluteValue = Math.abs(rawValue)

  const formatter = options.compact ? brlCompactFormatter : brlFormatter
  const formatted = formatter.format(absoluteValue)

  if (options.showSign) {
    if (isPositive) return `+ ${formatted}`
    if (isNegative) return `− ${formatted}`
    return formatted
  }

  if (isNegative) {
    return `− ${formatted}`
  }

  return formatted
}

/**
 * Soma valores em centavos garantindo resultado inteiro sem desvio de precisão.
 */
export function sumCents(...values: (number | null | undefined)[]): number {
  return values.reduce<number>((acc, cur) => acc + (cur ? Math.round(cur) : 0), 0)
}

/**
 * Subtrai b de a em centavos inteiros.
 */
export function subtractCents(a: number, b: number): number {
  return Math.round(a) - Math.round(b)
}

/**
 * Multiplica centavos por um fator escalar (ex: taxa ou quantidade), arredondando com segurança.
 */
export function multiplyCents(cents: number, factor: number): number {
  return Math.round(cents * factor)
}

/**
 * Calcula a porcentagem de uma parte em relação ao total (0 a 100%).
 * Retorna número com 1 casa decimal arredondada ou 0 se total for zero.
 */
export function calcPercentage(partInCents: number, totalInCents: number): number {
  if (!totalInCents || totalInCents === 0 || Number.isNaN(totalInCents)) {
    return 0
  }
  const ratio = (partInCents / totalInCents) * 100
  return Math.round(ratio * 10) / 10
}


export const formatCurrency = formatBRL
