import { useState, useMemo } from 'react'
import { useLiabilities } from '@/hooks/use-liabilities'
import { usePatrimony } from '@/hooks/use-patrimony'
import { useProperties } from '@/hooks/use-properties'
import { useTransactions } from '@/hooks/use-transactions'
import { LiabilityDialog } from '@/components/liability-dialog'
import { DebtAmortizationDialog } from '@/components/debt-amortization-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import {
  calculateDebtPortfolioMetrics,
  simulateAcceleratedDebtPayoff,
  type DebtItem,
  type DebtPayoffStrategy,
} from '@/lib/debt-strategies'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BadgePercent,
  Plus,
  Building,
  AlertTriangle,
  Calendar,
  Percent,
  Trash2,
  Edit2,
  MoreVertical,
  Flame,
  Snowflake,
  TrendingDown,
  Sparkles,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Liability } from '@/types/database'

export default function DividasPage() {
  const { liabilities, isLoading, deleteLiability } = useLiabilities()
  const { summary } = usePatrimony()
  const { properties } = useProperties()
  const { transactions } = useTransactions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [liabilityToEdit, setLiabilityToEdit] = useState<Liability | null>(null)
  const [amortizeDialogOpen, setAmortizeDialogOpen] = useState(false)
  const [liabilityToAmortize, setLiabilityToAmortize] = useState<Liability | null>(null)

  // Estratégia de Quitação
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>('avalanche')
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(300)
  const [oneTimeAport, setOneTimeAport] = useState<number>(0)

  // Financiamentos imobiliários
  const financedProperties = useMemo(
    () => properties.filter((p) => Number(p.financed_amount) > 0),
    [properties]
  )

  const totalMortgageDebt = useMemo(() => {
    return financedProperties.reduce((sum, p) => sum + Number(p.financed_amount), 0)
  }, [financedProperties])

  const totalOtherDebt = useMemo(() => {
    return liabilities.reduce((sum, l) => sum + Number(l.current_balance), 0)
  }, [liabilities])

  const totalCreditCardDebt = summary.liabilitiesBreakdown?.creditCard || 0
  const totalLiabilities = totalMortgageDebt + totalOtherDebt + totalCreditCardDebt

  // Estimativa de renda mensal líquida do usuário a partir de transações de entrada
  const estimatedMonthlyIncome = useMemo(() => {
    const incomes = transactions.filter((t) => t.kind === 'income' && t.status === 'completed')
    if (incomes.length === 0) return 8000 // fallback saudável
    const sum = incomes.reduce((acc, t) => acc + Number(t.amount), 0)
    return Math.max(2000, Math.round(sum / 3))
  }, [transactions])

  // Adapta passivos para o motor de estratégias
  const debtItems: DebtItem[] = useMemo(() => {
    const items: DebtItem[] = liabilities.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      currentBalance: Number(l.current_balance),
      monthlyPayment: Number(l.monthly_payment) || (l.current_balance > 0 ? Math.round(l.current_balance / 12) : 0),
      monthlyInterestRate: Number(l.interest_rate_monthly) || 2.0,
      remainingInstallments: l.remaining_installments,
    }))

    // Adiciona financiamentos imobiliários como passivo longo
    financedProperties.forEach((p) => {
      items.push({
        id: p.id,
        name: `Financiamento ${p.name}`,
        type: 'financing',
        currentBalance: Number(p.financed_amount),
        monthlyPayment: Number(p.current_installment) || 2000,
        monthlyInterestRate: 0.85,
        remainingInstallments: p.remaining_months || 240,
      })
    })

    return items
  }, [liabilities, financedProperties])

  // Métricas do Portfólio
  const metrics = useMemo(() => {
    return calculateDebtPortfolioMetrics(debtItems, estimatedMonthlyIncome)
  }, [debtItems, estimatedMonthlyIncome])

  // Ordenação estratégica dos passivos cadastrados
  const sortedLiabilities = useMemo(() => {
    const list = [...liabilities]
    if (strategy === 'avalanche') {
      return list.sort((a, b) => {
        const diffRate = (Number(b.interest_rate_monthly) || 0) - (Number(a.interest_rate_monthly) || 0)
        if (Math.abs(diffRate) > 0.001) return diffRate
        return Number(a.current_balance) - Number(b.current_balance)
      })
    }
    return list.sort((a, b) => Number(a.current_balance) - Number(b.current_balance))
  }, [liabilities, strategy])

  // Simulação de Aceleração
  const accelerationResult = useMemo(() => {
    return simulateAcceleratedDebtPayoff({
      debts: debtItems,
      extraMonthlyPayment,
      oneTimeExtraPayment: oneTimeAport,
      strategy,
    })
  }, [debtItems, extraMonthlyPayment, oneTimeAport, strategy])

  function handleCreate() {
    setLiabilityToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(l: Liability) {
    setLiabilityToEdit(l)
    setDialogOpen(true)
  }

  function handleAmortize(l: Liability) {
    setLiabilityToAmortize(l)
    setAmortizeDialogOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BadgePercent className="size-7 text-primary" />
            Dívidas & Financiamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão integrada de passivos, taxas de juros e metodologias para quitação acelerada.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs font-semibold gap-1.5">
          <Plus className="size-4" />
          Novo Passivo / Dívida
        </Button>
      </div>

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Passivo Total */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Passivo Total</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalLiabilities)}
          </div>
          <p className="text-[11px] text-muted-foreground">Imóveis + Empréstimos + Faturas</p>
        </div>

        {/* Comprometimento da Renda (DTI) */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Comprometimento (DTI)</span>
            <Percent className="size-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : `${metrics.dtiPercent}%`}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                metrics.dtiStatus === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : metrics.dtiStatus === 'moderate'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
            >
              {metrics.dtiStatus === 'healthy' ? 'Saudável' : metrics.dtiStatus === 'moderate' ? 'Atenção' : 'Crítico'}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">Parcelas mensais sobre a renda</p>
        </div>

        {/* Custo Médio de Juros */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Custo Médio de Juros</span>
            <Flame className="size-4 text-orange-500" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : `${metrics.weightedAverageInterestMonthly}% a.m.`}
          </div>
          <p className="text-[11px] text-muted-foreground">Taxa mensal ponderada pelo saldo</p>
        </div>

        {/* Horizonte até Quitação */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Previsão de Quitação</span>
            <Calendar className="size-4 text-indigo-500" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : metrics.estimatedMonthsToDebtFree > 0 ? (
              `${metrics.estimatedMonthsToDebtFree} meses`
            ) : (
              '100% Livre'
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Sem contar novas antecipações</p>
        </div>
      </div>

      {/* Simulador de Aceleração de Quitação */}
      {debtItems.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary/10">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Simulador de Quitação Acelerada
              </h2>
              <p className="text-xs text-muted-foreground">
                Descubra quanto tempo e dinheiro você economiza ao amortizar antecipadamente.
              </p>
            </div>

            {/* Alternador de Estratégia */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border">
              <button
                type="button"
                onClick={() => setStrategy('avalanche')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  strategy === 'avalanche'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Quita primeiro as dívidas com maiores juros para economizar o máximo de dinheiro."
              >
                <Flame className="size-3.5 text-orange-500" />
                Método Avalanche
              </button>

              <button
                type="button"
                onClick={() => setStrategy('snowball')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  strategy === 'snowball'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Quita primeiro as dívidas de menor saldo para obter vitórias rápidas."
              >
                <Snowflake className="size-3.5 text-blue-500" />
                Bola de Neve
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="extra-monthly" className="text-xs">
                  Aporte Extra Mensal (R$)
                </Label>
                <Input
                  id="extra-monthly"
                  type="number"
                  min="0"
                  step="50"
                  value={extraMonthlyPayment}
                  onChange={(e) => setExtraMonthlyPayment(Number(e.target.value) || 0)}
                  className="font-semibold tabular"
                />
                <p className="text-[11px] text-muted-foreground">
                  Valor a mais que você direciona todo mês para abater o principal.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="one-time-aport" className="text-xs">
                  Aporte Extra Único / 13º Salário (R$)
                </Label>
                <Input
                  id="one-time-aport"
                  type="number"
                  min="0"
                  step="500"
                  value={oneTimeAport}
                  onChange={(e) => setOneTimeAport(Number(e.target.value) || 0)}
                  className="tabular"
                />
                <p className="text-[11px] text-muted-foreground">
                  Bônus, restituição ou saldo do cofre aplicado hoje.
                </p>
              </div>
            </div>

            {/* Resultado do Impacto da Aceleração */}
            <div className="md:col-span-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Impacto da sua Estratégia
                </span>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Tempo Poupado</span>
                    <div className="text-2xl font-bold text-foreground tabular">
                      {accelerationResult.monthsSaved > 0
                        ? `${accelerationResult.monthsSaved} meses a menos`
                        : 'Mantenha aportes extras'}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      De {accelerationResult.originalMonths} meses para {accelerationResult.acceleratedMonths} meses.
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground">Economia Estimada de Juros</span>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular">
                      {formatBRL(accelerationResult.interestSaved)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Dinheiro que deixará de ir para o banco e ficará no seu patrimônio.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 text-xs text-muted-foreground">
                {strategy === 'avalanche' ? (
                  <p>
                    💡 <strong>Por que Avalanche?</strong> Ao atacar primeiro a dívida com a maior taxa de juros, você minimiza a sangria financeira e economiza o máximo absoluto em juros.
                  </p>
                ) : (
                  <p>
                    💡 <strong>Por que Bola de Neve?</strong> Ao eliminar dívidas pequenas rapidamente, você ganha impulso psicológico e libera parcelas inteiras para atacar as dívidas maiores.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista Priorizada de Passivos */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <h2 className="font-bold text-base text-foreground">
              Passivos Registrados ({liabilities.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Ordem de prioridade pelo {strategy === 'avalanche' ? 'Método Avalanche (Maior Taxa)' : 'Método Bola de Neve (Menor Saldo)'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : liabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed bg-card/40">
            <EmptyState
              title="Nenhum outro passivo registrado"
              description="Cadastre empréstimos pessoais, dívidas parceladas ou outros compromissos para manter seu balanço patrimonial 100% preciso."
              icon={BadgePercent}
            />
            <Button size="sm" onClick={handleCreate} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar Passivo
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedLiabilities.map((l, index) => {
              const currentBal = Number(l.current_balance)
              const originalAmount = Number(l.total_amount) || currentBal
              const paidPercent =
                originalAmount > 0
                  ? Math.min(100, Math.max(0, Math.round(((originalAmount - currentBal) / originalAmount) * 100)))
                  : 0

              return (
                <div key={l.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">{l.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {l.type === 'loan'
                          ? 'Empréstimo'
                          : l.type === 'financing'
                          ? 'Financiamento'
                          : l.type === 'tax'
                          ? 'Tributo'
                          : 'Dívida'}
                      </Badge>
                      {index === 0 && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">
                          1º na Fila de Quitação
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {l.interest_rate_monthly && (
                        <span className="font-semibold text-foreground">
                          {l.interest_rate_monthly}% a.m.
                        </span>
                      )}
                      {l.monthly_payment && (
                        <span>Parcela: {formatBRL(l.monthly_payment)}</span>
                      )}
                      {l.remaining_installments && (
                        <span>{l.remaining_installments} parcelas restantes</span>
                      )}
                      {l.due_date && <span>Vencimento: {formatDate(l.due_date)}</span>}
                    </div>

                    {/* Barra de Progresso de Quitação */}
                    {originalAmount > currentBal && (
                      <div className="space-y-1 max-w-sm pt-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Progresso de Quitação</span>
                          <span className="font-bold text-foreground">{paidPercent}%</span>
                        </div>
                        <Progress value={paidPercent} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground">Saldo Devedor</span>
                      <div className="tabular font-bold text-base text-rose-600 dark:text-rose-400">
                        {formatBRL(currentBal)}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAmortize(l)}
                      className="text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <TrendingDown className="size-3.5" />
                      Amortizar
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(l)}>
                          <Edit2 className="size-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteLiability(l.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Financiamentos Imobiliários Ativos */}
      {financedProperties.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <Building className="size-5 text-primary" />
              <div>
                <h2 className="font-bold text-base text-foreground">Financiamentos Imobiliários</h2>
                <p className="text-xs text-muted-foreground">
                  Crédito habitacional com amortização Price/SAC gerenciado no módulo de Imóveis.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold tabular text-primary">
              {formatBRL(totalMortgageDebt)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financedProperties.map((prop) => (
              <div key={prop.id} className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-foreground">{prop.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    Imobiliário
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Saldo Devedor:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular">
                    {formatBRL(prop.financed_amount)}
                  </span>
                </div>
                {Boolean(prop.current_installment) && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Parcela Atual:</span>
                    <span className="font-semibold text-foreground tabular">
                      {formatBRL(prop.current_installment)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      <LiabilityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        liabilityToEdit={liabilityToEdit}
      />

      <DebtAmortizationDialog
        open={amortizeDialogOpen}
        onOpenChange={setAmortizeDialogOpen}
        liability={liabilityToAmortize}
      />
    </div>
  )
}
