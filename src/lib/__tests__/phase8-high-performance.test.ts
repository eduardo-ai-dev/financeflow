import { describe, it, expect } from 'vitest'
import { buildMonthlyCalendar } from '@/lib/calendar'
import { buildFinancialAlerts } from '@/lib/alerts'
import { parseBankStatementCsv } from '@/lib/csv-import'
import { escapeHtml, buildExecutiveReportHtml } from '@/lib/pdf-export'
import type { TransactionWithDetails } from '@/services/transactions'
import type { CreditCardWithLimit } from '@/services/cards'
import type { InvoiceWithTotals } from '@/services/invoices'
import type { GoalWithStats } from '@/services/goals'

const USER_ID = '11111111-2222-3333-4444-555555555555'

function makeTx(overrides: Partial<TransactionWithDetails>): TransactionWithDetails {
  return {
    id: 'tx-1',
    user_id: USER_ID,
    kind: 'expense',
    status: 'pending',
    description: 'Conta de Energia',
    amount: 250,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    due_date: '2026-11-10',
    paid_date: null,
    notes: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

describe('Phase 8 — Calendário Financeiro Mensal', () => {
  it('consolida receitas, contas, faturas e atrasos sem duplicar compras de cartão ou transferências', () => {
    const transactions: TransactionWithDetails[] = [
      makeTx({
        id: 'inc-1',
        kind: 'income',
        status: 'completed',
        description: 'Salário',
        amount: 8000,
        due_date: '2026-11-05',
      }),
      makeTx({
        id: 'exp-overdue',
        kind: 'expense',
        status: 'pending',
        description: 'Condomínio',
        amount: 900,
        due_date: '2026-11-02',
      }),
      makeTx({
        id: 'card-buy-ignored',
        kind: 'card_purchase',
        status: 'completed',
        description: 'Compra no Crédito',
        amount: 500,
        due_date: '2026-11-03',
      }),
      makeTx({
        id: 'transfer-ignored',
        kind: 'transfer',
        status: 'completed',
        description: 'Transferência Interna',
        amount: 2000,
        due_date: '2026-11-04',
      }),
    ]

    const invoices: InvoiceWithTotals[] = [
      {
        id: 'inv-1',
        user_id: USER_ID,
        card_id: 'card-1',
        month: 11,
        year: 2026,
        closing_date: '2026-11-08',
        due_date: '2026-11-15',
        status: 'open',
        payment_transaction_id: null,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        total_amount: 1450.5,
        transactions_count: 4,
        card: null,
      },
    ]

    const cal = buildMonthlyCalendar({
      year: 2026,
      month: 11,
      todayStr: '2026-11-04',
      transactions,
      cards: [],
      invoices,
      properties: [],
    })

    expect(cal.cells).toHaveLength(42)
    expect(cal.summary.totalIncome).toBe(8000)
    expect(cal.summary.invoicesTotal).toBe(1450.5)
    expect(cal.summary.totalOutflows).toBe(2350.5) // 900 + 1450.50 (ignora card_purchase e transfer)
    expect(cal.summary.overdueCount).toBe(1)
    expect(cal.summary.overdueAmount).toBe(900)
    expect(cal.summary.projectedBalance).toBe(5649.5)
  })
})

describe('Phase 8 — Central de Alertas Inteligentes', () => {
  it('prioriza alertas críticos (contas vencidas), limite elevado de cartão e metas concluídas', () => {
    const cards: CreditCardWithLimit[] = [
      {
        id: 'card-1',
        user_id: USER_ID,
        name: 'Black Principal',
        institution: 'Banco X',
        brand: 'mastercard',
        limit_amount: 10000,
        initial_used_amount: 0,
        closing_day: 20,
        due_day: 28,
        color: '#111827',
        default_account_id: null,
        is_archived: false,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        used_amount: 9000,
        available_limit: 1000,
      },
    ]

    const goals: GoalWithStats[] = [
      {
        id: 'goal-1',
        user_id: USER_ID,
        name: 'Reserva de Emergência',
        brand: null,
        priority: 'essential',
        target_amount: 20000,
        current_amount: 20000,
        target_date: '2026-12-31',
        account_id: null,
        category_id: null,
        status: 'in_progress',
        purchased_amount: null,
        purchased_date: null,
        converted_to_asset: false,
        asset_id: null,
        image_url: null,
        notes: null,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        progress_percent: 100,
        remaining_amount: 0,
      },
    ]

    const alerts = buildFinancialAlerts({
      todayStr: '2026-11-10',
      transactions: [
        makeTx({
          id: 'tx-late',
          kind: 'expense',
          status: 'pending',
          description: 'Internet Fibra',
          amount: 149.9,
          due_date: '2026-11-08',
        }),
      ],
      cards,
      invoices: [],
      goals,
    })

    expect(alerts.length).toBeGreaterThanOrEqual(3)
    expect(alerts[0].severity).toBe('critical')
    expect(alerts[0].id).toContain('tx-overdue')
    expect(alerts.some((a) => a.id === 'card-limit-card-1')).toBe(true)
    expect(alerts.some((a) => a.id === 'goal-100-goal-1' && a.severity === 'success')).toBe(
      true
    )
  })
})

describe('Phase 8 — Importação de Extratos CSV & Exportação PDF Segura', () => {
  it('interpreta CSV brasileiro (; e vírgula decimal) e ignora transferências neutras', () => {
    const csv = [
      'Data;Descrição;Valor;Tipo',
      '05/11/2026;Salário Empresa;12.500,00;Receita',
      '07/11/2026;"Supermercado Central";-642,35;Despesa',
      '08/11/2026;Transferência entre contas;1.000,00;Transferência',
      'data-invalida;Linha Ruim;abc;Despesa',
    ].join('\r\n')

    const parsed = parseBankStatementCsv(csv)
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.skippedCount).toBe(2)
    expect(parsed.summary.incomeTotal).toBe(12500)
    expect(parsed.summary.expenseTotal).toBe(642.35)
    expect(parsed.rows[0].due_date).toBe('2026-11-05')
    expect(parsed.rows[1].kind).toBe('expense')
  })

  it('interpreta CSV padrão internacional (, e ponto decimal) sem coluna Tipo', () => {
    const csv = [
      'Date,Description,Amount',
      '2026-11-12,"Restaurante, Almoço",-89.90',
      '2026-11-15,Reembolso Cliente,340.00',
    ].join('\n')

    const parsed = parseBankStatementCsv(csv)
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0]).toMatchObject({
      due_date: '2026-11-12',
      description: 'Restaurante, Almoço',
      amount: 89.9,
      kind: 'expense',
    })
    expect(parsed.rows[1]).toMatchObject({
      due_date: '2026-11-15',
      amount: 340,
      kind: 'income',
    })
  })

  it('escapa caracteres HTML perigosos (prevenção de XSS) ao montar o relatório PDF', () => {
    const malicious = '<img src=x onerror="alert(1)"> & <script>evil()</script>'
    expect(escapeHtml(malicious)).not.toContain('<script>')
    expect(escapeHtml(malicious)).toContain('&lt;script&gt;')

    const html = buildExecutiveReportHtml({
      periodLabel: 'Novembro 2026',
      userName: malicious,
      dre: {
        grossIncome: 5000,
        fixedExpenses: 1500,
        variableExpenses: 800,
        occasionalAndExtraExpenses: 200,
        totalConsumption: 2500,
        investmentContributions: 500,
        mortgagePayments: 0,
        operationalSurplus: 2500,
        netCashFlow: 2000,
        savingsRate: 50,
      },
      upcomingBills: [],
      monthTransactions: [
        {
          due_date: '2026-11-10',
          description: malicious,
          kindLabel: 'Despesa',
          statusLabel: 'Efetivado',
          amount: 100,
          isIncome: false,
        },
      ],
    })

    expect(html).not.toContain('<script>evil()</script>')
    expect(html).not.toContain('<img src=x')
  })
})

