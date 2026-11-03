import { z } from 'zod'
import { toCents, fromCents, sumCents } from '@/lib/money'

export const MAX_CSV_IMPORT_ROWS = 500
export const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024 // 2 MB

export const parsedStatementRowSchema = z.object({
  id: z.string(),
  lineNumber: z.number().int().positive(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  description: z
    .string()
    .trim()
    .min(1, 'Descrição vazia')
    .max(200, 'Descrição excede 200 caracteres'),
  amount: z
    .number()
    .positive('O valor deve ser maior que zero')
    .max(1_000_000_000, 'Valor acima do limite permitido'),
  kind: z.enum(['income', 'expense'] as const),
  notes: z.string().max(500).nullable().optional(),
})

export type ParsedStatementRow = z.infer<typeof parsedStatementRowSchema>

export interface CsvParseError {
  lineNumber: number
  reason: string
}

export interface CsvParseResult {
  rows: ParsedStatementRow[]
  skippedCount: number
  errors: CsvParseError[]
  summary: {
    totalRows: number
    incomeCount: number
    incomeTotal: number
    expenseCount: number
    expenseTotal: number
  }
}

function normalizeHeader(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectCsvDelimiter(headerLine: string): ';' | ',' | '\t' {
  const counts: Record<';' | ',' | '\t', number> = { ';': 0, ',': 0, '\t': 0 }
  let inQuotes = false

  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && (ch === ';' || ch === ',' || ch === '\t')) {
      counts[ch] += 1
    }
  }

  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t'] && counts[';'] > 0) {
    return ';'
  }
  if (counts['\t'] > counts[','] && counts['\t'] > 0) {
    return '\t'
  }
  return ','
}

export function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }

  cells.push(current.trim())
  return cells
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1990 || year > 2100) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const check = new Date(Date.UTC(year, month - 1, day))
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  )
}

export function parseFlexibleDateToISO(raw: string): string | null {
  const cleaned = raw.replace(/^["']|["']$/g, '').trim()
  if (!cleaned) return null

  // Remove parte de horário caso exista (ex: "2026-11-02 14:30:00" ou "02/11/2026T00:00")
  const datePart = cleaned.split(/[ T]/)[0]

  // Formato ISO: YYYY-MM-DD ou YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(datePart)
  if (isoMatch) {
    const y = Number(isoMatch[1])
    const m = Number(isoMatch[2])
    const d = Number(isoMatch[3])
    if (!isValidCalendarDate(y, m, d)) return null
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // Formato Brasileiro: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY ou DD/MM/YY
  const brMatch = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(datePart)
  if (brMatch) {
    const d = Number(brMatch[1])
    const m = Number(brMatch[2])
    let y = Number(brMatch[3])
    if (y < 100) {
      y += 2000
    }
    if (!isValidCalendarDate(y, m, d)) return null
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return null
}

export function parseFlexibleMoney(raw: string): number | null {
  if (!raw) return null
  let cleaned = raw
    .replace(/^["']|["']$/g, '')
    .replace(/[R$\s\u00A0]/gi, '')
    .trim()

  if (!cleaned) return null

  let isNegative = false
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true
    cleaned = cleaned.slice(1, -1)
  } else if (cleaned.endsWith('-')) {
    isNegative = true
    cleaned = cleaned.slice(0, -1)
  } else if (cleaned.startsWith('-')) {
    isNegative = true
    cleaned = cleaned.slice(1)
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1)
  }

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let normalized = cleaned
  if (lastComma > lastDot) {
    // Formato brasileiro: 1.234,56 -> 1234.56
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma && lastComma !== -1) {
    // Formato americano com milhar: 1,234.56 -> 1234.56
    normalized = cleaned.replace(/,/g, '')
  } else if (lastComma !== -1 && lastDot === -1) {
    normalized = cleaned.replace(',', '.')
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  return isNegative ? -num : num
}

function inferKindFromTypeColumn(
  rawType: string | undefined,
  signedAmount: number
): 'income' | 'expense' | 'ignore' {
  if (rawType) {
    const norm = normalizeHeader(rawType)
    if (
      norm.includes('transfer') ||
      norm.includes('aporte') ||
      norm.includes('resgate') ||
      norm.includes('pagamento fatura')
    ) {
      return 'ignore'
    }
    if (
      norm === 'c' ||
      norm === 'credito' ||
      norm === 'credit' ||
      norm.includes('receita') ||
      norm.includes('entrada') ||
      norm === 'income'
    ) {
      return 'income'
    }
    if (
      norm === 'd' ||
      norm === 'debito' ||
      norm === 'debit' ||
      norm.includes('despesa') ||
      norm.includes('saida') ||
      norm.includes('compra') ||
      norm === 'expense'
    ) {
      return 'expense'
    }
  }

  return signedAmount < 0 ? 'expense' : 'income'
}

export function parseBankStatementCsv(rawContent: string): CsvParseResult {
  const withoutBom = rawContent.replace(/^\uFEFF/, '')
  const rawLines = withoutBom
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (rawLines.length === 0) {
    return {
      rows: [],
      skippedCount: 0,
      errors: [{ lineNumber: 1, reason: 'O arquivo selecionado está vazio.' }],
      summary: {
        totalRows: 0,
        incomeCount: 0,
        incomeTotal: 0,
        expenseCount: 0,
        expenseTotal: 0,
      },
    }
  }

  const delimiter = detectCsvDelimiter(rawLines[0])
  const firstCells = splitCsvLine(rawLines[0], delimiter)
  const firstCellIsDate = parseFlexibleDateToISO(firstCells[0] || '') !== null

  let dateIdx = -1
  let descIdx = -1
  let amountIdx = -1
  let typeIdx = -1
  let notesIdx = -1
  let startLineIdx = 1

  if (firstCellIsDate && firstCells.length >= 3) {
    // CSV sem cabeçalho no padrão Data;Descrição;Valor
    dateIdx = 0
    descIdx = 1
    amountIdx = 2
    startLineIdx = 0
  } else {
    const normalizedHeaders = firstCells.map(normalizeHeader)

    dateIdx = normalizedHeaders.findIndex(
      (h) =>
        h === 'data' ||
        h === 'data de vencimento' ||
        h === 'vencimento' ||
        h === 'date' ||
        h === 'data lancamento' ||
        h.startsWith('data ')
    )

    descIdx = normalizedHeaders.findIndex(
      (h) =>
        h.includes('descric') ||
        h.includes('historic') ||
        h === 'titulo' ||
        h.includes('estabelecimento') ||
        h === 'lancamento' ||
        h === 'description' ||
        h === 'memo' ||
        h === 'detalhe'
    )

    amountIdx = normalizedHeaders.findIndex(
      (h) =>
        h === 'valor' ||
        h.startsWith('valor ') ||
        h === 'quantia' ||
        h === 'amount' ||
        h === 'value' ||
        h === 'montante'
    )

    typeIdx = normalizedHeaders.findIndex(
      (h) =>
        h === 'tipo' ||
        h === 'natureza' ||
        h === 'kind' ||
        h === 'type' ||
        h === 'operacao' ||
        h === 'c d'
    )

    notesIdx = normalizedHeaders.findIndex(
      (h) =>
        h === 'notas' ||
        h.includes('observac') ||
        h === 'identificador' ||
        h === 'documento'
    )

    // Fallback posicional caso o banco use nomes fora do padrão em 3 colunas
    if (dateIdx === -1 && firstCells.length >= 3) dateIdx = 0
    if (descIdx === -1 && firstCells.length >= 3) {
      descIdx = dateIdx === 0 ? 1 : 0
    }
    if (amountIdx === -1 && firstCells.length >= 3) {
      amountIdx = firstCells.length - 1
    }
  }

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      rows: [],
      skippedCount: rawLines.length,
      errors: [
        {
          lineNumber: 1,
          reason:
            'Não foi possível identificar as colunas de Data, Descrição e Valor no arquivo CSV.',
        },
      ],
      summary: {
        totalRows: 0,
        incomeCount: 0,
        incomeTotal: 0,
        expenseCount: 0,
        expenseTotal: 0,
      },
    }
  }

  const rows: ParsedStatementRow[] = []
  const errors: CsvParseError[] = []
  let skippedCount = 0

  const dataLines = rawLines.slice(startLineIdx, startLineIdx + MAX_CSV_IMPORT_ROWS)

  dataLines.forEach((line, idx) => {
    const lineNumber = startLineIdx + idx + 1
    const cells = splitCsvLine(line, delimiter)

    const rawDate = cells[dateIdx] || ''
    const rawDesc = cells[descIdx] || ''
    const rawAmount = cells[amountIdx] || ''
    const rawType = typeIdx >= 0 ? cells[typeIdx] : undefined
    const rawNotes = notesIdx >= 0 ? cells[notesIdx] : undefined

    const isoDate = parseFlexibleDateToISO(rawDate)
    if (!isoDate) {
      skippedCount += 1
      errors.push({ lineNumber, reason: `Data inválida ("${rawDate.slice(0, 24)}")` })
      return
    }

    const signedAmount = parseFlexibleMoney(rawAmount)
    if (signedAmount === null || signedAmount === 0) {
      skippedCount += 1
      if (signedAmount !== 0) {
        errors.push({ lineNumber, reason: `Valor inválido ("${rawAmount.slice(0, 24)}")` })
      }
      return
    }

    const kind = inferKindFromTypeColumn(rawType, signedAmount)
    if (kind === 'ignore') {
      skippedCount += 1
      return
    }

    const cleanDescription = rawDesc
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)

    const candidate = {
      id: `csv-row-${lineNumber}`,
      lineNumber,
      due_date: isoDate,
      description: cleanDescription || (kind === 'income' ? 'Entrada importada' : 'Saída importada'),
      amount: fromCents(toCents(Math.abs(signedAmount))),
      kind,
      notes: rawNotes ? rawNotes.trim().slice(0, 500) : null,
    }

    const parsed = parsedStatementRowSchema.safeParse(candidate)
    if (!parsed.success) {
      skippedCount += 1
      errors.push({
        lineNumber,
        reason: parsed.error.issues[0]?.message || 'Linha inválida',
      })
      return
    }

    rows.push(parsed.data)
  })

  if (rawLines.length - startLineIdx > MAX_CSV_IMPORT_ROWS) {
    errors.push({
      lineNumber: startLineIdx + MAX_CSV_IMPORT_ROWS + 1,
      reason: `Limite de ${MAX_CSV_IMPORT_ROWS} linhas por importação atingido; linhas excedentes foram ignoradas.`,
    })
  }

  let incomeCount = 0
  let incomeCents = 0
  let expenseCount = 0
  let expenseCents = 0

  for (const r of rows) {
    if (r.kind === 'income') {
      incomeCount += 1
      incomeCents = sumCents(incomeCents, toCents(r.amount))
    } else {
      expenseCount += 1
      expenseCents = sumCents(expenseCents, toCents(r.amount))
    }
  }

  return {
    rows,
    skippedCount,
    errors,
    summary: {
      totalRows: rows.length,
      incomeCount,
      incomeTotal: fromCents(incomeCents),
      expenseCount,
      expenseTotal: fromCents(expenseCents),
    },
  }
}

export function generateSampleCsvTemplate(): string {
  return [
    'Data;Descrição;Valor;Tipo;Notas',
    '05/11/2026;Salário Mensal;8500,00;Receita;Crédito em conta',
    '08/11/2026;Condomínio Residencial;-890,00;Despesa;Boleto mensal',
    '10/11/2026;Supermercado;-435,90;Despesa;Compras da semana',
    '15/11/2026;Consultoria Pontual;1200,00;Receita;PIX recebido',
  ].join('\r\n')
}

