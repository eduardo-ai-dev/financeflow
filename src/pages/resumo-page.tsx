import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { formatBRL } from '@/lib/money'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react'

const PIE_COLORS = [
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#10b981',
  '#06b6d4',
  '#64748b',
]

interface CategoryExpense {
  name: string
  color: string
  amount: number
  percent: number
  [key: string]: unknown
}

export default function ResumoPage() {
  const { transactions, isLoading } = useTransactions()
  const [activeView, setActiveView] = useState<'all' | 'completed'>('completed')

  // Filtra de acordo com a visualização (apenas efetivado ou previsto total)
  const relevantTransactions = useMemo(() => {
    if (activeView === 'completed') {
      return transactions.filter((tx) => tx.status === 'completed')
    }
    return transactions.filter((tx) => tx.status !== 'canceled')
  }, [transactions, activeView])

  // Métricas de Receita e Despesa
  const totalIncome = useMemo(() => {
    return relevantTransactions
      .filter((tx) => tx.kind === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  }, [relevantTransactions])

  const totalExpense = useMemo(() => {
    return relevantTransactions
      .filter((tx) => tx.kind === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  }, [relevantTransactions])

  const netResult = totalIncome - totalExpense

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0
    const rate = ((totalIncome - totalExpense) / totalIncome) * 100
    return Math.round(rate)
  }, [totalIncome, totalExpense])

  // Dados do gráfico de barras (Comparativo Receitas x Despesas)
  const barChartData = useMemo(() => {
    const completedIncome = transactions
      .filter((tx) => tx.kind === 'income' && tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const completedExpense = transactions
      .filter((tx) => tx.kind === 'expense' && tx.status === 'completed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const pendingIncome = transactions
      .filter((tx) => tx.kind === 'income' && tx.status === 'pending')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const pendingExpense = transactions
      .filter((tx) => tx.kind === 'expense' && tx.status === 'pending')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    return [
      {
        name: 'Realizado (Efetivado)',
        Receitas: completedIncome,
        Despesas: completedExpense,
      },
      {
        name: 'Previsto (Total)',
        Receitas: completedIncome + pendingIncome,
        Despesas: completedExpense + pendingExpense,
      },
    ]
  }, [transactions])

  // Despesas agrupadas por categoria para gráfico de rosca (PieChart)
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { amount: number; color: string }>()

    relevantTransactions
      .filter((tx) => tx.kind === 'expense')
      .forEach((tx) => {
        const catName = tx.category?.name || 'Sem Categoria'
        const catColor = tx.category?.color || '#94a3b8'
        const current = map.get(catName) || { amount: 0, color: catColor }
        map.set(catName, {
          amount: current.amount + Number(tx.amount),
          color: catColor,
        })
      })

    const list: CategoryExpense[] = []
    map.forEach((val, name) => {
      list.push({
        name,
        color: val.color,
        amount: val.amount,
        percent: totalExpense > 0 ? (val.amount / totalExpense) * 100 : 0,
      })
    })

    return list.sort((a, b) => b.amount - a.amount)
  }, [relevantTransactions, totalExpense])

  const hasData = transactions.some((tx) => tx.kind === 'income' || tx.kind === 'expense')

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Resumo Financeiro & Fluxo de Caixa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise consolidada de receitas vs. despesas, capacidade de poupança e composição dos gastos.
          </p>
        </div>

        <div className="inline-flex rounded-lg border bg-muted/40 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeView === 'completed'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Apenas Efetivados
          </button>
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeView === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Efetivados + Previstos
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Receitas {activeView === 'completed' ? 'Efetivadas' : 'Totais'}</span>
            <ArrowDownLeft className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalIncome)}
          </div>
          <p className="text-[11px] text-muted-foreground">Entradas financeiras do período</p>
        </div>

        {/* Despesas */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Despesas {activeView === 'completed' ? 'Pagas' : 'Totais'}</span>
            <ArrowUpRight className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalExpense)}
          </div>
          <p className="text-[11px] text-muted-foreground">Saídas e gastos operacionais</p>
        </div>

        {/* Resultado Operacional */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Resultado Operacional</span>
            <Scale className="size-4 text-primary" />
          </div>
          <div
            className={`tabular text-2xl font-bold tracking-tight ${
              netResult >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isLoading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : (
              `${netResult >= 0 ? '+' : ''}${formatBRL(netResult)}`
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Receitas menos despesas</p>
        </div>

        {/* Taxa de Poupança */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Taxa de Poupança</span>
            <PiggyBank className="size-4 text-blue-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <>
                <span>{savingsRate}%</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    savingsRate >= 30
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : savingsRate >= 15
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : savingsRate >= 0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {savingsRate >= 30
                    ? 'Excelente'
                    : savingsRate >= 15
                    ? 'Saudável'
                    : savingsRate >= 0
                    ? 'Atenção'
                    : 'Deficitário'}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">% da receita poupada/investida</p>
        </div>
      </div>

      {/* Conteúdo com Gráficos ou Estado Vazio */}
      {!isLoading && !hasData ? (
        <EmptyState
          title="Nenhuma movimentação para analisar"
          description="Cadastre receitas e despesas nas telas de Entradas ou Saídas para visualizar a análise gráfica do seu fluxo de caixa."
          icon={BarChart3}
          phase={2}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Comparativo de Receitas vs Despesas */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base tracking-tight text-foreground flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  Receitas vs. Despesas
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparação direta entre fluxo realizado e compromissos totais.
                </p>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: number) => `R$ ${val}`}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Composição de Despesas por Categoria */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-base tracking-tight text-foreground flex items-center gap-2">
                <PieIcon className="size-4 text-primary" />
                Composição das Despesas por Categoria
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Distribuição percentual dos seus gastos no período.
              </p>
            </div>

            {expensesByCategory.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center p-4">
                <PieIcon className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma despesa categorizada no período selecionado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => [formatBRL(Number(val) || 0), 'Valor']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista de Categorias com porcentagem */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {expensesByCategory.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              cat.color || PIE_COLORS[idx % PIE_COLORS.length],
                          }}
                        />
                        <span className="font-medium text-foreground truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular shrink-0">
                        <span className="text-muted-foreground font-semibold">
                          {cat.percent.toFixed(1)}%
                        </span>
                        <span className="font-bold text-foreground">
                          {formatBRL(cat.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regra de Ouro Contábil: Neutralidade das Transferências */}
      <div className="rounded-2xl border bg-muted/20 p-5 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          <TrendingUp className="size-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-foreground">
            Princípio da Neutralidade do Fluxo de Caixa (Regra 2)
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Transferências entre contas próprias e aportes em investimentos atualizam os saldos bancários
            em tempo real, mas nunca são contabilizados como receita ou despesa de consumo.
            Seu fluxo de caixa reflete rigorosamente sua economia real sem distorções contábeis.
          </p>
        </div>
      </div>
    </div>
  )
}
export { ResumoPage }
