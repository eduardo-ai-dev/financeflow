import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useInvoices } from '@/hooks/use-invoices'
import { formatBRL } from '@/lib/money'
import { formatDate, getTodayDateString } from '@/lib/date'
import {
  calculateCashFlowForecast,
  type CashFlowForecastSummary,
} from '@/lib/cash-flow-forecast'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'

export function CashFlowForecastWidget() {
  const [horizon, setHorizon] = useState<30 | 60>(30)
  const { transactions, isLoading: loadingTx } = useTransactions()
  const { accounts, isLoading: loadingAcc } = useAccounts()
  const { invoices, isLoading: loadingInv } = useInvoices()

  const todayStr = useMemo(() => getTodayDateString(), [])

  // Saldo líquido atual em contas operacionais e carteiras
  const currentLiquidBalance = useMemo(() => {
    return accounts
      .filter((a) => !a.is_archived && a.type !== 'brokerage')
      .reduce((sum, a) => sum + (a.current_balance || 0), 0)
  }, [accounts])

  const forecast: CashFlowForecastSummary = useMemo(() => {
    return calculateCashFlowForecast({
      startingBalance: currentLiquidBalance,
      transactions,
      invoices,
      horizonDays: horizon,
      todayStr,
    })
  }, [currentLiquidBalance, transactions, invoices, horizon, todayStr])

  const isLoading = loadingTx || loadingAcc || loadingInv

  // Amostragem inteligente para o gráfico (evita superlotação do eixo X)
  const chartData = useMemo(() => {
    const step = horizon === 30 ? 2 : 4
    return forecast.timeline.filter((_, idx) => idx % step === 0 || idx === forecast.timeline.length - 1)
  }, [forecast.timeline, horizon])

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    )
  }

  const isNetPositive = forecast.netChange >= 0
  const isHealthy = forecast.status === 'healthy'
  const isCritical = forecast.status === 'critical'

  return (
    <section
      aria-label="Previsão de Fluxo de Caixa"
      className="rounded-2xl border bg-card p-5 sm:p-6 shadow-xs space-y-6"
    >
      {/* Top Header com Seletor de Horizonte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              Previsão de Fluxo de Caixa & Liquidez
            </h2>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                isHealthy
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : isCritical
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              {isHealthy ? 'Liquidez Confortável' : isCritical ? 'Risco de Iliquidez' : 'Margem de Atenção'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Projeção contábil do saldo diário considerando receitas agendadas, contas a pagar e faturas de cartão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor 30d / 60d */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border text-xs">
            <button
              type="button"
              onClick={() => setHorizon(30)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                horizon === 30
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Próximos 30 dias
            </button>
            <button
              type="button"
              onClick={() => setHorizon(60)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                horizon === 60
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Próximos 60 dias
            </button>
          </div>

          <Link to="/calendario">
            <Button variant="ghost" size="icon" className="size-8" title="Abrir Calendário Financeiro">
              <CalendarDays className="size-4 text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de Resumo dos Números Preditivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Saldo Inicial Hoje */}
        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Saldo Atual Hoje
          </span>
          <div className="tabular text-lg sm:text-xl font-bold text-foreground">
            {formatBRL(forecast.startingBalance)}
          </div>
          <span className="text-[10px] text-muted-foreground">Ponto de partida líquido</span>
        </div>

        {/* Entradas Previstas */}
        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="size-3" />
            Receitas Previstas
          </span>
          <div className="tabular text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatBRL(forecast.totalProjectedIncome)}
          </div>
          <span className="text-[10px] text-muted-foreground">{horizon} dias à frente</span>
        </div>

        {/* Saídas e Faturas Previstas */}
        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="size-3" />
            Compromissos / Faturas
          </span>
          <div className="tabular text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
            -{formatBRL(forecast.totalProjectedExpenses)}
          </div>
          <span className="text-[10px] text-muted-foreground">Contas fixas e cartões</span>
        </div>

        {/* Saldo Final Projetado */}
        <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-1">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="size-3" />
            Saldo em {horizon} dias
          </span>
          <div
            className={`tabular text-lg sm:text-xl font-bold ${
              forecast.projectedFinalBalance >= 0
                ? 'text-foreground'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatBRL(forecast.projectedFinalBalance)}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Variação: {isNetPositive ? '+' : ''}
            {formatBRL(forecast.netChange)}
          </span>
        </div>
      </div>

      {/* Gráfico da Curva de Liquidez Preditiva */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground">
            Evolução Projetada da Disponibilidade de Caixa
          </span>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              Mínima prevista:{' '}
              <strong
                className={`tabular ${
                  forecast.lowestBalance < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-foreground'
                }`}
              >
                {formatBRL(forecast.lowestBalance)}
              </strong>{' '}
              ({formatDate(forecast.lowestBalanceDate)})
            </span>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="liquidityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                width={55}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-xl border bg-popover/95 p-3 text-xs shadow-md backdrop-blur-md space-y-1">
                        <p className="font-bold text-foreground">
                          {data.displayDate} ({data.dayOfWeek})
                        </p>
                        <p className="text-muted-foreground">
                          Saldo Projetado:{' '}
                          <strong className="text-foreground tabular">
                            {formatBRL(data.balance)}
                          </strong>
                        </p>
                        {data.income > 0 && (
                          <p className="text-emerald-500 font-semibold tabular">
                            + {formatBRL(data.income)} em entradas
                          </p>
                        )}
                        {data.expenses > 0 && (
                          <p className="text-rose-500 font-semibold tabular">
                            - {formatBRL(data.expenses)} em saídas
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#liquidityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerta de Mínima Liquidez & Principais Eventos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Próximos Desembolsos Críticos */}
        <div className="p-4 rounded-xl border bg-muted/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="size-3.5 text-rose-500" />
              Maiores Desembolsos Programados
            </span>
            <Link to="/contas-a-pagar" className="text-[11px] text-primary hover:underline font-medium">
              Ver contas
            </Link>
          </div>

          {forecast.topUpcomingOutflows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Nenhuma despesa ou fatura programada no período.
            </p>
          ) : (
            <div className="space-y-2">
              {forecast.topUpcomingOutflows.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
                  </div>
                  <span className="tabular font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    -{formatBRL(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnóstico Preditivo */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
            isHealthy
              ? 'border-emerald-500/25 bg-emerald-500/5'
              : isCritical
              ? 'border-rose-500/25 bg-rose-500/5'
              : 'border-amber-500/25 bg-amber-500/5'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              {isHealthy ? (
                <ShieldCheck className="size-4 text-emerald-500" />
              ) : isCritical ? (
                <AlertTriangle className="size-4 text-rose-500" />
              ) : (
                <AlertTriangle className="size-4 text-amber-500" />
              )}
              <span className="text-foreground">Diagnóstico de Liquidez</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {forecast.statusMessage}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">Planejar no Calendário</span>
            <Link to="/calendario">
              <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold gap-1 text-primary">
                Abrir Visão Mensal
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
