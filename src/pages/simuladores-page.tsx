import { useState, useMemo } from 'react'
import { formatBRL } from '@/lib/money'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Calculator,
  TrendingUp,
  Percent,
  Sparkles,
  Flame,
} from 'lucide-react'

export default function SimuladoresPage() {
  const [activeTab, setActiveTab] = useState<'compound' | 'amortization' | 'fire'>('compound')

  // 1. Estados do Simulador de Juros Compostos
  const [initialAmount, setInitialAmount] = useState<number>(10000)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1500)
  const [annualRate, setAnnualRate] = useState<number>(11.5)
  const [years, setYears] = useState<number>(10)

  // 2. Estados do Simulador de Amortização
  const [mortgageBalance, setMortgageBalance] = useState<number>(300000)
  const [mortgageRateAnnual, setMortgageRateAnnual] = useState<number>(10.5)
  const [extraPayment, setExtraPayment] = useState<number>(5000)

  // 3. Estados do Simulador FIRE (Independência Financeira)
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(8000)
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState<number>(4.0)

  // Cálculos de Juros Compostos
  const compoundResult = useMemo(() => {
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
    const totalMonths = years * 12

    let total = initialAmount
    let totalInvested = initialAmount

    for (let m = 1; m <= totalMonths; m++) {
      total = total * (1 + monthlyRate) + monthlyContribution
      totalInvested += monthlyContribution
    }

    const totalInterest = Math.max(0, total - totalInvested)

    return {
      totalAccumulated: Math.round(total),
      totalInvested: Math.round(totalInvested),
      totalInterest: Math.round(totalInterest),
    }
  }, [initialAmount, monthlyContribution, annualRate, years])

  // Cálculos de Amortização Extra
  const amortizationResult = useMemo(() => {
    const monthlyRate = mortgageRateAnnual / 100 / 12
    const estimatedInterestSaved = Math.round(extraPayment * monthlyRate * 12 * 5)
    return {
      interestSaved: estimatedInterestSaved,
      newBalance: Math.max(0, mortgageBalance - extraPayment),
    }
  }, [mortgageBalance, mortgageRateAnnual, extraPayment])

  // Cálculos do FIRE (Regra dos 4%)
  const fireResult = useMemo(() => {
    const annualExpenses = monthlyExpenses * 12
    const targetFire = Math.round(annualExpenses / (safeWithdrawalRate / 100))
    const safeMonthlyIncome = Math.round((targetFire * (safeWithdrawalRate / 100)) / 12)

    return {
      targetFire,
      safeMonthlyIncome,
    }
  }, [monthlyExpenses, safeWithdrawalRate])

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Calculator className="size-7 text-primary" />
            Simuladores Financeiros
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ferramentas matemáticas para projeção de patrimônio, amortização e liberdade financeira.
          </p>
        </div>
      </div>

      {/* Seletor de Simulador */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/40 border">
        <button
          type="button"
          onClick={() => setActiveTab('compound')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'compound'
              ? 'bg-background text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="size-4 text-emerald-500" />
          Juros Compostos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('amortization')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'amortization'
              ? 'bg-background text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Percent className="size-4 text-primary" />
          Amortização Antecipada
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fire')}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'fire'
              ? 'bg-background text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Flame className="size-4 text-amber-500" />
          Independência Financeira (FIRE)
        </button>
      </div>

      {/* Simulador 1: Juros Compostos */}
      {activeTab === 'compound' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-500" />
              Parâmetros de Investimento
            </h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-initial">Valor Inicial (R$)</Label>
                <Input
                  id="c-initial"
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-monthly">Aporte Mensal (R$)</Label>
                <Input
                  id="c-monthly"
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-rate">Rentabilidade Estimada (% a.a.)</Label>
                <Input
                  id="c-rate"
                  type="number"
                  step="0.1"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-years">Prazo (em anos)</Label>
                <Input
                  id="c-years"
                  type="number"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value) || 1)}
                  className="tabular font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resultado Projetado em {years} anos
              </span>
              <div className="tabular text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatBRL(compoundResult.totalAccumulated)}
              </div>
              <p className="text-xs text-muted-foreground">
                Patrimônio total acumulado entre aportes e juros sobre juros.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Total Investido (Do seu bolso)</span>
                <p className="text-lg font-bold text-foreground tabular">
                  {formatBRL(compoundResult.totalInvested)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Juros Acumulados (Lucro)</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular">
                  + {formatBRL(compoundResult.totalInterest)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
              <Sparkles className="size-4 inline-block mr-1.5 -mt-0.5 text-emerald-500" />
              Os juros gerados representam{' '}
              <strong>
                {compoundResult.totalInvested > 0
                  ? Math.round(
                      (compoundResult.totalInterest / compoundResult.totalInvested) * 100
                    )
                  : 0}
                %
              </strong>{' '}
              de ganho sobre o capital aportado ao longo do período.
            </div>
          </div>
        </div>
      )}

      {/* Simulador 2: Amortização */}
      {activeTab === 'amortization' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <Percent className="size-5 text-primary" />
              Dados do Financiamento
            </h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-balance">Saldo Devedor Atual (R$)</Label>
                <Input
                  id="a-balance"
                  type="number"
                  value={mortgageBalance}
                  onChange={(e) => setMortgageBalance(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="a-rate">Taxa de Juros Efetiva (% a.a.)</Label>
                <Input
                  id="a-rate"
                  type="number"
                  step="0.1"
                  value={mortgageRateAnnual}
                  onChange={(e) => setMortgageRateAnnual(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="a-extra">Valor da Amortização Extraordinária (R$)</Label>
                <Input
                  id="a-extra"
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Economia Estimada em Juros Futuros
              </span>
              <div className="tabular text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatBRL(amortizationResult.interestSaved)}
              </div>
              <p className="text-xs text-muted-foreground">
                Juros que deixam de incidir sobre o saldo devedor abatido antecipadamente.
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Novo Saldo Devedor:</span>
                <strong className="text-foreground tabular">
                  {formatBRL(amortizationResult.newBalance)}
                </strong>
              </div>
            </div>

            <div className="rounded-xl border border-primary/25 bg-primary/10 p-3.5 text-xs text-foreground">
              Amortizações extraordinárias abatem diretamente o principal da dívida, permitindo reduzir anos de parcelas ou diminuir a prestação mensal.
            </div>
          </div>
        </div>
      )}

      {/* Simulador 3: FIRE */}
      {activeTab === 'fire' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <Flame className="size-5 text-amber-500" />
              Estilo de Vida e Despesas
            </h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-expense">Custo de Vida Mensal Desejado (R$)</Label>
                <Input
                  id="f-expense"
                  type="number"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
                  className="tabular font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-rate">Taxa Segura de Retirada (% a.a.)</Label>
                <Input
                  id="f-rate"
                  type="number"
                  step="0.5"
                  value={safeWithdrawalRate}
                  onChange={(e) => setSafeWithdrawalRate(Number(e.target.value) || 4)}
                  className="tabular font-semibold"
                />
                <p className="text-[10px] text-muted-foreground">
                  A Regra clássica de Trinity utiliza 4% ao ano.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Patrimônio Necessário para Independência
              </span>
              <div className="tabular text-3xl sm:text-4xl font-extrabold text-foreground">
                {formatBRL(fireResult.targetFire)}
              </div>
              <p className="text-xs text-muted-foreground">
                Volume financeiro investido que sustenta sua renda perpétua de{' '}
                <strong>{formatBRL(fireResult.safeMonthlyIncome)}/mês</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
              Ao atingir esse montante, os rendimentos reais da carteira cobrem 100% dos seus custos sem consumir o patrimônio principal.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
