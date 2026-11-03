import { formatBRL } from '@/lib/money'
import { formatDate, formatDateTime } from '@/lib/date'

/**
 * Escapa caracteres especiais HTML para impedir qualquer injeção de script (XSS)
 * na geração do relatório executivo para impressão / PDF.
 */
export function escapeHtml(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface ExecutivePdfReportData {
  periodLabel: string
  userName?: string | null
  dre: {
    grossIncome: number
    fixedExpenses: number
    variableExpenses: number
    occasionalAndExtraExpenses: number
    totalConsumption: number
    investmentContributions: number
    mortgagePayments: number
    operationalSurplus: number
    netCashFlow: number
    savingsRate: number
  }
  upcomingBills: Array<{
    title: string
    date: string
    amount: number
    status: string
  }>
  monthTransactions: Array<{
    due_date: string
    description: string
    kindLabel: string
    statusLabel: string
    amount: number
    isIncome: boolean
  }>
}

export function buildExecutiveReportHtml(data: ExecutivePdfReportData): string {
  const generatedAt = formatDateTime(new Date())
  const safePeriod = escapeHtml(data.periodLabel)
  const safeUser = escapeHtml(data.userName || 'Cliente FinanceFlow')

  const upcomingRowsHtml =
    data.upcomingBills.length === 0
      ? `<tr><td colspan="4" class="empty">Nenhum compromisso pendente mapeado.</td></tr>`
      : data.upcomingBills
          .slice(0, 20)
          .map(
            (b) => `
            <tr>
              <td>${escapeHtml(b.title)}</td>
              <td>${escapeHtml(/^\d{4}-\d{2}-\d{2}$/.test(b.date) ? formatDate(b.date) : b.date)}</td>
              <td>${escapeHtml(b.status)}</td>
              <td class="num">${escapeHtml(formatBRL(b.amount))}</td>
            </tr>`
          )
          .join('')

  const txRowsHtml =
    data.monthTransactions.length === 0
      ? `<tr><td colspan="5" class="empty">Nenhuma movimentação registrada neste período.</td></tr>`
      : data.monthTransactions
          .slice(0, 120)
          .map(
            (tx) => `
            <tr>
              <td>${escapeHtml(formatDate(tx.due_date))}</td>
              <td>${escapeHtml(tx.description)}</td>
              <td>${escapeHtml(tx.kindLabel)}</td>
              <td>${escapeHtml(tx.statusLabel)}</td>
              <td class="num ${tx.isIncome ? 'pos' : 'neg'}">${tx.isIncome ? '+ ' : '- '}${escapeHtml(
                formatBRL(tx.amount)
              )}</td>
            </tr>`
          )
          .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Financeiro — ${safePeriod}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 28px 32px;
      font-size: 12px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #10b981;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .brand span { color: #059669; }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .kpi {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      font-weight: 700;
    }
    .kpi-val {
      font-size: 15px;
      font-weight: 800;
      margin-top: 4px;
      font-variant-numeric: tabular-nums;
    }
    h2 {
      font-size: 13px;
      font-weight: 700;
      margin: 18px 0 8px;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    th, td {
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 10px;
    }
    td.num, th.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .row-highlight td {
      font-weight: 700;
      background: #f8fafc;
    }
    .row-final td {
      font-weight: 800;
      font-size: 12px;
      background: #ecfdf5;
      border-top: 2px solid #10b981;
    }
    .pos { color: #059669; font-weight: 700; }
    .neg { color: #e11d48; font-weight: 700; }
    .empty { text-align: center; color: #64748b; padding: 14px; font-style: italic; }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 10px 14px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Finance<span>Flow</span></div>
      <div style="font-size: 12px; color: #475569; margin-top: 2px;">
        Relatório Executivo &amp; Demonstrativo Pessoal — <strong>${safePeriod}</strong>
      </div>
    </div>
    <div class="meta">
      <div>Titular: <strong>${safeUser}</strong></div>
      <div>Emitido em: ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Receita Bruta</div>
      <div class="kpi-val pos">${escapeHtml(formatBRL(data.dre.grossIncome))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Consumo Total</div>
      <div class="kpi-val neg">${escapeHtml(formatBRL(data.dre.totalConsumption))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Sobra Operacional</div>
      <div class="kpi-val ${data.dre.operationalSurplus >= 0 ? 'pos' : 'neg'}">
        ${escapeHtml(formatBRL(data.dre.operationalSurplus, { showSign: true }))}
      </div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Taxa de Poupança</div>
      <div class="kpi-val">${data.dre.savingsRate}%</div>
    </div>
  </div>

  <h2>1. Demonstrativo de Resultado Pessoal (DRE)</h2>
  <table>
    <tbody>
      <tr>
        <td><strong>(+) Receita Bruta Operacional</strong></td>
        <td class="num pos">${escapeHtml(formatBRL(data.dre.grossIncome))}</td>
      </tr>
      <tr>
        <td style="padding-left: 18px;">(&minus;) Custos Fixos</td>
        <td class="num neg">&minus;${escapeHtml(formatBRL(data.dre.fixedExpenses))}</td>
      </tr>
      <tr>
        <td style="padding-left: 18px;">(&minus;) Custos Variáveis</td>
        <td class="num neg">&minus;${escapeHtml(formatBRL(data.dre.variableExpenses))}</td>
      </tr>
      <tr>
        <td style="padding-left: 18px;">(&minus;) Gastos Eventuais e Extraordinários</td>
        <td class="num neg">&minus;${escapeHtml(formatBRL(data.dre.occasionalAndExtraExpenses))}</td>
      </tr>
      <tr class="row-highlight">
        <td>(=) Total de Consumo Operacional</td>
        <td class="num neg">&minus;${escapeHtml(formatBRL(data.dre.totalConsumption))}</td>
      </tr>
      <tr class="row-highlight">
        <td>(=) Resultado Operacional Líquido</td>
        <td class="num ${data.dre.operationalSurplus >= 0 ? 'pos' : 'neg'}">
          ${escapeHtml(formatBRL(data.dre.operationalSurplus, { showSign: true }))}
        </td>
      </tr>
      <tr>
        <td style="padding-left: 18px;">(&minus;) Aportes em Investimentos e Reservas</td>
        <td class="num">${escapeHtml(formatBRL(data.dre.investmentContributions))}</td>
      </tr>
      <tr>
        <td style="padding-left: 18px;">(&minus;) Amortização / Parcelas Imobiliárias</td>
        <td class="num">${escapeHtml(formatBRL(data.dre.mortgagePayments))}</td>
      </tr>
      <tr class="row-final">
        <td>(=) Fluxo de Caixa Livre do Período</td>
        <td class="num ${data.dre.netCashFlow >= 0 ? 'pos' : 'neg'}">
          ${escapeHtml(formatBRL(data.dre.netCashFlow, { showSign: true }))}
        </td>
      </tr>
    </tbody>
  </table>

  <h2>2. Próximos Vencimentos &amp; Compromissos</h2>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Vencimento</th>
        <th>Situação</th>
        <th class="num">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${upcomingRowsHtml}
    </tbody>
  </table>

  <h2>3. Extrato de Movimentações do Período</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Tipo</th>
        <th>Status</th>
        <th class="num">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${txRowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <span>FinanceFlow — Gestão Financeira &amp; Patrimonial</span>
    <span>Documento confidencial de uso pessoal</span>
  </div>
</body>
</html>`
}

export function exportFinancialReportPdf(data: ExecutivePdfReportData): void {
  const html = buildExecutiveReportHtml(data)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
    }, 1500)
  }

  const doc = iframe.contentWindow?.document
  if (!doc || !iframe.contentWindow) {
    cleanup()
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      cleanup()
    }
  }, 250)
}

