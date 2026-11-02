import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { useCards } from '@/hooks/use-cards'
import { useProperties } from '@/hooks/use-properties'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Building,
  Receipt,
} from 'lucide-react'

export default function RelatoriosPage() {
  const { transactions } = useTransactions()
  const { categories } = useCategories()
  const { cards } = useCards()
  const { properties } = useProperties()

  const [todayStr] = useState(() => new Date().toISOString().substring(0, 10))
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // DRE Pessoal do Mês Selecionado
  const dre = useMemo(() => {
    let grossIncome = 0
    let fixedExpenses = 0
    let variableExpenses = 0
    let investmentContributions = 0
    let mortgagePayments = 0

    const categoryMap = new Map<string, string>()
    categories.forEach((c) => categoryMap.set(c.id, c.name.toLowerCase()))

    transactions.forEach((t) => {
      if (t.status === 'canceled') return
      const tMonth = (t.paid_date || t.due_date).substring(0, 7)
      if (tMonth !== selectedMonth) return

      if (t.kind === 'income') {
        grossIncome += t.amount
      } else if (t.kind === 'investment_contribution') {
        investmentContributions += t.amount
      } else if (t.property_id) {
        mortgagePayments += t.amount
      } else if (t.kind === 'expense' || t.kind === 'card_purchase') {
        const catName = t.category_id ? categoryMap.get(t.category_id) || '' : ''
        // Categorização simples para o DRE
        if (
          catName.includes('moradia') ||
          catName.includes('aluguel') ||
          catName.includes('condomínio') ||
          catName.includes('energia') ||
          catName.includes('água') ||
          catName.includes('internet')
        ) {
          fixedExpenses += t.amount
        } else {
          variableExpenses += t.amount
        }
      }
    })

    const totalConsumption = fixedExpenses + variableExpenses
    const operationalSurplus = grossIncome - totalConsumption
    const netCashFlow = operationalSurplus - investmentContributions - mortgagePayments
    const savingsRate =
      grossIncome > 0 ? Math.round(((grossIncome - totalConsumption) / grossIncome) * 100) : 0

    return {
      grossIncome,
      fixedExpenses,
      variableExpenses,
      totalConsumption,
      investmentContributions,
      mortgagePayments,
      operationalSurplus,
      netCashFlow,
      savingsRate,
    }
  }, [transactions, categories, selectedMonth])

  // Calendário / Próximos Vencimentos
  const upcomingBills = useMemo(() => {
    const list: Array<{
      id: string
      title: string
      date: string
      amount: number
      type: 'invoice' | 'property' | 'transaction'
      status: string
    }> = []

    // 1. Transações pendentes próximas
    transactions.forEach((t) => {
      if (t.status === 'pending' && t.due_date >= todayStr) {
        list.push({
          id: t.id,
          title: t.description,
          date: t.due_date,
          amount: t.amount,
          type: 'transaction',
          status: 'A Vencer',
        })
      }
    })

    // 2. Faturas de cartão com vencimento
    cards.forEach((c) => {
      if (c.used_amount > 0) {
        list.push({
          id: `card-${c.id}`,
          title: `Fatura Cartão ${c.name}`,
          date: `Dia ${c.due_day} do mês`,
          amount: c.used_amount,
          type: 'invoice',
          status: 'Fechamento / Vencimento',
        })
      }
    })

    // 3. Financiamentos Imobiliários
    properties.forEach((p) => {
      if (p.financed_amount > 0) {
        list.push({
          id: `prop-${p.id}`,
          title: `Financiamento ${p.name}`,
          date: 'Mensal',
          amount: p.financed_amount / (p.total_term_months || 360),
          type: 'property',
          status: 'Parcela Imobiliária',
        })
      }
    })

    return list
  }, [transactions, cards, properties, todayStr])

  // Exportação CSV compatível com Excel brasileiro (; delimitador e vírgula decimal)
  function handleExportCSV() {
    const headers = [
      'Data de Vencimento',
      'Data de Pagamento',
      'Tipo',
      'Status',
      'Descrição',
      'Valor (R$)',
      'Notas',
    ]

    const rows = transactions.map((t) => {
      const typeLabel =
        t.kind === 'income'
          ? 'Receita'
          : t.kind === 'expense'
          ? 'Despesa'
          : t.kind === 'card_purchase'
          ? 'Compra Cartão'
          : t.kind === 'transfer'
          ? 'Transferência'
          : t.kind === 'investment_contribution'
          ? 'Aporte Investimento'
          : t.kind === 'investment_redemption'
          ? 'Resgate Investimento'
          : 'Pagamento Fatura'

      const statusLabel =
        t.status === 'completed'
          ? 'Concluído'
          : t.status === 'pending'
          ? 'Pendente'
          : 'Cancelado'

      const formattedAmount = t.amount.toFixed(2).replace('.', ',')

      return [
        t.due_date,
        t.paid_date || '',
        typeLabel,
        statusLabel,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${formattedAmount}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `financeflow_extrato_${selectedMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios & DRE Pessoal</h1>
          <p className="text-sm text-muted-foreground">
            Demonstrativo de Resultado do Exercício Pessoal, agenda de vencimentos e exportação de dados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Mês:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
          <Button onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV Excel
          </Button>
        </div>
      </div>

      {/* DRE Pessoal Consolidado */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-base">Demonstrativo de Resultado Pessoal (DRE)</h2>
              <p className="text-xs text-muted-foreground">
                Estrutura contábil com separação clara entre despesas de consumo, aportes patrimoniais e financiamentos.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Taxa de Poupança Operacional</span>
            <div className="text-lg font-bold text-primary">{dre.savingsRate}%</div>
          </div>
        </div>

        {/* Linhas do DRE */}
        <div className="space-y-2 text-sm">
          {/* Receitas */}
          <div className="flex justify-between py-2 border-b font-medium text-emerald-600 dark:text-emerald-400">
            <span>(+) RECEITA BRUTA OPERACIONAL</span>
            <span>{formatBRL(dre.grossIncome)}</span>
          </div>

          {/* Despesas Fixas */}
          <div className="flex justify-between py-1.5 pl-4 text-muted-foreground">
            <span>(&minus;) Custos Fixos (Moradia, Conectividade, Contas Básicas)</span>
            <span className="text-destructive font-medium">
              &minus;{formatBRL(dre.fixedExpenses)}
            </span>
          </div>

          {/* Despesas Variáveis */}
          <div className="flex justify-between py-1.5 pl-4 text-muted-foreground">
            <span>(&minus;) Custos Variáveis (Alimentação, Lazer, Consumo Livre)</span>
            <span className="text-destructive font-medium">
              &minus;{formatBRL(dre.variableExpenses)}
            </span>
          </div>

          {/* Subtotal Consumo */}
          <div className="flex justify-between py-2 border-b bg-muted/20 px-3 rounded font-semibold">
            <span>(=) TOTAL DE CONSUMO E GASTOS OPERACIONAIS</span>
            <span className="text-destructive">&minus;{formatBRL(dre.totalConsumption)}</span>
          </div>

          {/* Sobra Operacional */}
          <div className="flex justify-between py-2 border-b font-bold text-foreground">
            <span>(=) RESULTADO OPERACIONAL LÍQUIDO (SOBRA DE CAIXA)</span>
            <span
              className={
                dre.operationalSurplus >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive'
              }
            >
              {dre.operationalSurplus >= 0 ? '+' : ''}
              {formatBRL(dre.operationalSurplus)}
            </span>
          </div>

          {/* Destinações Patrimoniais */}
          <div className="flex justify-between py-1.5 pl-4 text-muted-foreground">
            <span>
              (&minus;) Aportes em Investimentos & Reserva (Transferência Patrimonial)
            </span>
            <span className="text-primary font-medium">
              {formatBRL(dre.investmentContributions)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 pl-4 text-muted-foreground">
            <span>
              (&minus;) Amortização / Parcelas Imobiliárias (Construção de Patrimônio)
            </span>
            <span className="text-primary font-medium">
              {formatBRL(dre.mortgagePayments)}
            </span>
          </div>

          {/* Fluxo de Caixa Final */}
          <div className="flex justify-between py-3 border-t-2 border-border font-black text-base bg-primary/5 px-3 rounded-lg">
            <span>(=) FLUXO DE CAIXA FINAL LIVRE DO PERÍODO</span>
            <span
              className={
                dre.netCashFlow >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive'
              }
            >
              {dre.netCashFlow >= 0 ? '+' : ''}
              {formatBRL(dre.netCashFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* Agenda e Próximos Vencimentos */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="font-bold text-base">Agenda de Vencimentos & Compromissos</h2>
              <p className="text-xs text-muted-foreground">
                Próximos compromissos financeiros para evitar atrasos e juros.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
            {upcomingBills.length} compromisso{upcomingBills.length !== 1 ? 's' : ''} mapeado{upcomingBills.length !== 1 ? 's' : ''}
          </span>
        </div>

        {upcomingBills.length === 0 ? (
          <div className="p-8 text-center text-sm text-emerald-600 font-medium">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            Nenhuma conta ou compromisso pendente no momento!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {upcomingBills.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between hover:bg-muted/20 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    {b.type === 'invoice' ? (
                      <CreditCard className="h-4 w-4" />
                    ) : b.type === 'property' ? (
                      <Building className="h-4 w-4" />
                    ) : (
                      <Receipt className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{b.title}</h4>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Vencimento: {b.date}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-foreground">
                    {formatBRL(b.amount)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
