import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { usePatrimony } from '@/hooks/use-patrimony'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { KpiCard } from '@/components/kpi-card'
import { TransactionDialog } from '@/components/transaction-dialog'
import { formatBRL } from '@/lib/money'
import { formatDate, formatMonthYear } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  CreditCard,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: metrics, isLoading, isFetching, refetch } = useDashboardMetrics()
  const { summary: patrimonySummary, isLoading: isLoadingPatrimony } = usePatrimony()
  const { transactions, isLoading: isLoadingTx } = useTransactions()
  const { cards, isLoading: isLoadingCards } = useCards()

  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [txInitialKind, setTxInitialKind] = useState<'income' | 'expense'>('expense')

  const [currentDate] = useState(() => new Date())
  const currentMonthName = useMemo(() => formatMonthYear(currentDate), [currentDate])
  const todayFormatted = useMemo(() => formatDate(currentDate), [currentDate])

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions])
  const activeCards = useMemo(() => cards.filter((c) => !c.is_archived), [cards])

  const effectiveNetWorth = useMemo(() => {
    if (!isLoadingPatrimony) {
      return patrimonySummary.netWorth
    }
    return metrics?.netWorth ?? 0
  }, [isLoadingPatrimony, patrimonySummary.netWorth, metrics?.netWorth])

  function handleQuickLaunch(kind: 'income' | 'expense') {
    setTxInitialKind(kind)
    setTxDialogOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Banner de Boas-Vindas e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="size-3.5 text-primary" />
            <span>
              {todayFormatted} &middot; {currentMonthName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Olá, {profile?.full_name || 'Investidor'}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aqui está o panorama consolidado da sua vida financeira hoje.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickLaunch('income')}
            className="text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <ArrowDownLeft className="size-3.5 mr-1.5" />
            + Receita
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickLaunch('expense')}
            className="text-xs font-semibold border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
          >
            <ArrowUpRight className="size-3.5 mr-1.5" />
            + Despesa
          </Button>

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
          {/* 1. Patrimônio Líquido Consolidado */}
          <KpiCard
            title="Patrimônio Líquido"
            value={formatBRL(effectiveNetWorth)}
            icon={Scale}
            badge="Ativos − Passivos"
            badgeVariant="info"
            description="Caixa + Investimentos + Bens − Dívidas"
            iconColor="bg-info/10 text-info"
            isLoading={isLoading && isLoadingPatrimony}
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
            iconColor={
              (metrics?.monthlyBalance ?? 0) >= 0
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            }
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
            value={`${metrics?.accountsCount ?? 0} ${
              metrics?.accountsCount === 1 ? 'conta' : 'contas'
            }`}
            icon={Wallet}
            badge="Atividade"
            badgeVariant="default"
            description={`${metrics?.transactionsCount ?? 0} lançamentos em ${currentMonthName}`}
            iconColor="bg-primary/10 text-primary"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Painel Operacional: Últimas Movimentações & Cartões de Crédito */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Últimos Lançamentos */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs lg:col-span-3 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h2 className="text-base font-bold tracking-tight">Últimos Lançamentos</h2>
              <p className="text-xs text-muted-foreground">
                Movimentações recentes registradas nas suas contas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/entradas">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Entradas
                </Button>
              </Link>
              <Link to="/saidas">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Saídas <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {isLoadingTx ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleQuickLaunch('income')}
                >
                  + Registrar Primeira Receita
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickLaunch('expense')}
                >
                  + Registrar Despesa
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTransactions.map((tx) => {
                const isIncome = tx.kind === 'income'
                const isTransfer = tx.kind === 'transfer'
                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : isTransfer
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="size-4" />
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{tx.description}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{formatDate(tx.due_date)}</span>
                          <span>&middot;</span>
                          <span className="truncate">{tx.account?.name || 'Cartão'}</span>
                          {tx.status === 'pending' ? (
                            <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
                              <Clock className="size-3" /> Pendente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-emerald-500 font-medium">
                              <CheckCircle2 className="size-3" /> Efetivado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`tabular text-sm font-bold whitespace-nowrap ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isTransfer
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isTransfer ? '' : isIncome ? '+ ' : '- '}
                      {formatBRL(tx.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resumo de Cartões de Crédito */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4.5 text-primary" />
              <div>
                <h2 className="text-base font-bold tracking-tight">Cartões & Limites</h2>
                <p className="text-xs text-muted-foreground">
                  Limite total, gasto e disponível
                </p>
              </div>
            </div>
            <Link to="/cartoes">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Gerenciar <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {isLoadingCards ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : activeCards.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum cartão de crédito cadastrado.
              </p>
              <Link to="/cartoes">
                <Button size="sm" variant="outline" className="text-xs">
                  + Cadastrar Cartão
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCards.slice(0, 3).map((card) => {
                const percent =
                  card.limit_amount > 0
                    ? Math.min(100, Math.round((card.used_amount / card.limit_amount) * 100))
                    : 0
                return (
                  <div
                    key={card.id}
                    className="rounded-xl border bg-muted/20 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: card.color || '#10b981' }}
                        />
                        <span className="text-sm font-semibold">{card.name}</span>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Venc. dia {card.due_day}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percent >= 85
                            ? 'bg-destructive'
                            : percent >= 60
                            ? 'bg-amber-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs tabular">
                      <span className="text-muted-foreground">
                        Gasto:{' '}
                        <strong className="text-rose-500">
                          {formatBRL(card.used_amount)}
                        </strong>
                      </span>
                      <span className="text-muted-foreground">
                        Disponível:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {formatBRL(card.available_limit)}
                        </strong>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
              Todos os indicadores acima são calculados diretamente no PostgreSQL pelo Supabase a partir das views <code>account_balances</code> e <code>card_limits</code>, com isolamento Row Level Security ativo para o seu usuário.
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

      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        initialKind={txInitialKind}
      />
    </div>
  )
}
