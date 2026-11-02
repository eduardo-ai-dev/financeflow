import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { KpiCard } from '@/components/kpi-card'
import { formatBRL } from '@/lib/money'
import { formatDate, formatMonthYear } from '@/lib/date'
import { Button } from '@/components/ui/button'
import {
  Scale,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Wallet,
  RotateCw,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: metrics, isLoading, isFetching, refetch } = useDashboardMetrics()

  const [currentDate] = useState(() => new Date())
  const currentMonthName = useMemo(() => formatMonthYear(currentDate), [currentDate])
  const todayFormatted = useMemo(() => formatDate(currentDate), [currentDate])

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Banner de Boas-Vindas e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="size-3.5 text-primary" />
            <span>{todayFormatted} &middot; {currentMonthName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Olá, {profile?.full_name || 'Investidor'}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aqui está o panorama consolidado da sua vida financeira hoje.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs font-medium"
            title="Atualizar métricas do banco"
          >
            <RotateCw className={`size-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <div className="inline-flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="size-3.5" />
            <span className="hidden sm:inline font-medium">Dados Reais Supabase</span>
          </div>
        </div>
      </div>

      {/* Grid de KPI Cards */}
      <section aria-label="Métricas Principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 1. Patrimônio Líquido */}
          <KpiCard
            title="Patrimônio Líquido"
            value={formatBRL(metrics?.netWorth ?? 0)}
            icon={Scale}
            badge="Ativos − Passivos"
            badgeVariant="info"
            description="Balanço patrimonial total"
            iconColor="bg-info/10 text-info"
            isLoading={isLoading}
          />

          {/* 2. Saldo Total em Contas */}
          <KpiCard
            title="Saldo em Contas"
            value={formatBRL(metrics?.totalBalance ?? 0)}
            icon={Landmark}
            badge="Liquidez"
            badgeVariant="default"
            description={`Imediata: ${formatBRL(metrics?.immediateLiquidity ?? 0)}`}
            iconColor="bg-primary/10 text-primary"
            isLoading={isLoading}
          />

          {/* 3. Saldo Mensal (Resultado Líquido) */}
          <KpiCard
            title="Saldo no Mês"
            value={formatBRL(metrics?.monthlyBalance ?? 0, { showSign: true })}
            icon={CircleDollarSign}
            badge={(metrics?.monthlyBalance ?? 0) >= 0 ? 'Superávit' : 'Déficit'}
            badgeVariant={(metrics?.monthlyBalance ?? 0) >= 0 ? 'success' : 'destructive'}
            valueColor={(metrics?.monthlyBalance ?? 0) >= 0 ? 'text-success' : 'text-destructive'}
            description="Receitas − Despesas no mês"
            iconColor={(metrics?.monthlyBalance ?? 0) >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
            isLoading={isLoading}
          />

          {/* 4. Total de Entradas no Mês */}
          <KpiCard
            title="Entradas (Mês)"
            value={formatBRL(metrics?.monthlyIncome ?? 0)}
            valueColor="text-success"
            icon={ArrowDownLeft}
            badge="Receitas"
            badgeVariant="success"
            description={
              (metrics?.pendingIncome ?? 0) > 0
                ? `+ ${formatBRL(metrics?.pendingIncome ?? 0)} a receber`
                : 'Sem pendências'
            }
            iconColor="bg-success/10 text-success"
            isLoading={isLoading}
          />

          {/* 5. Total de Saídas no Mês */}
          <KpiCard
            title="Saídas (Mês)"
            value={formatBRL(metrics?.monthlyExpenses ?? 0)}
            valueColor="text-destructive"
            icon={ArrowUpRight}
            badge="Despesas"
            badgeVariant="destructive"
            description={
              (metrics?.pendingExpenses ?? 0) > 0
                ? `${formatBRL(metrics?.pendingExpenses ?? 0)} a pagar`
                : 'Sem pendências'
            }
            iconColor="bg-destructive/10 text-destructive"
            isLoading={isLoading}
          />

          {/* 6. Atividade & Contas */}
          <KpiCard
            title="Contas & Lançamentos"
            value={`${metrics?.accountsCount ?? 0} ${metrics?.accountsCount === 1 ? 'conta' : 'contas'}`}
            icon={Wallet}
            badge="Atividade"
            badgeVariant="default"
            description={`${metrics?.transactionsCount ?? 0} lançamentos em ${currentMonthName}`}
            iconColor="bg-primary/10 text-primary"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Card Informativo de Integridade */}
      <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight">
              Motor Financeiro Conectado (Regras de Negócio do README)
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Todos os indicadores acima são calculados diretamente no PostgreSQL pelo Supabase a partir da view <code>account_balances</code> e da tabela <code>transactions</code>, com Row Level Security ativa para o seu usuário.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                Regra 2: Transferências neutras
              </span>
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                Regra 4: Aportes fora de despesas
              </span>
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                Regra 7: Sem dados simulados
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
