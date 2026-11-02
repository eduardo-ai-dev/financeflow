import { useState, useMemo } from 'react'
import { usePatrimony } from '@/hooks/use-patrimony'
import { useTransactions } from '@/hooks/use-transactions'
import { formatBRL } from '@/lib/money'
import {
  runSandboxSimulation,
  type SimulationEvent,
} from '@/lib/simulation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  Info,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

export default function PlanejamentoPage() {
  const { summary } = usePatrimony()
  const { transactions } = useTransactions()

  // Calcula médias mensais reais baseadas nas transações existentes
  const { defaultMonthlyIncome, defaultMonthlyExpense } = useMemo(() => {
    let incomeSum = 0
    let expenseSum = 0

    transactions.forEach((t) => {
      if (t.status !== 'canceled') {
        if (t.kind === 'income') incomeSum += t.amount
        if (t.kind === 'expense' || t.kind === 'card_purchase') expenseSum += t.amount
      }
    })

    return {
      defaultMonthlyIncome: incomeSum > 0 ? Math.round(incomeSum) : 8000,
      defaultMonthlyExpense: expenseSum > 0 ? Math.round(expenseSum) : 5500,
    }
  }, [transactions])

  // Parâmetros do Sandbox
  const [horizonMonths, setHorizonMonths] = useState<number>(12)
  const [incomeAdjPercent, setIncomeAdjPercent] = useState<number>(10)
  const [expenseAdjFixed, setExpenseAdjFixed] = useState<number>(-400)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1000)
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(11.5) // 11.5% a.a.
  const [events, setEvents] = useState<SimulationEvent[]>([])

  // Novo evento avulso
  const [eventMonth, setEventMonth] = useState<number>(6)
  const [eventAmount, setEventAmount] = useState<string>('5000')
  const [eventName, setEventName] = useState<string>('Bônus / 13º Salário')
  const [eventType, setEventType] = useState<'income' | 'expense'>('income')

  // Execução do Simulador Sandbox (Regra 5: puramente em memória!)
  const simulation = useMemo(() => {
    return runSandboxSimulation({
      horizonMonths,
      initialCash: summary.assetsBreakdown.cash,
      initialInvestments: summary.assetsBreakdown.investments,
      monthlyIncomeBase: defaultMonthlyIncome,
      monthlyExpenseBase: defaultMonthlyExpense,
      incomeAdjustmentPercent: incomeAdjPercent,
      expenseAdjustmentFixed: expenseAdjFixed,
      annualInvestmentReturnRate: annualReturnRate / 100,
      monthlyContribution,
      events,
    })
  }, [
    horizonMonths,
    summary.assetsBreakdown.cash,
    summary.assetsBreakdown.investments,
    defaultMonthlyIncome,
    defaultMonthlyExpense,
    incomeAdjPercent,
    expenseAdjFixed,
    annualReturnRate,
    monthlyContribution,
    events,
  ])

  function applyPreset(preset: 'conservative' | 'realistic' | 'optimistic' | 'transition') {
    if (preset === 'conservative') {
      setIncomeAdjPercent(0)
      setExpenseAdjFixed(300)
      setMonthlyContribution(400)
      setAnnualReturnRate(9.0)
    } else if (preset === 'realistic') {
      setIncomeAdjPercent(5)
      setExpenseAdjFixed(-200)
      setMonthlyContribution(1000)
      setAnnualReturnRate(10.5)
    } else if (preset === 'optimistic') {
      setIncomeAdjPercent(20)
      setExpenseAdjFixed(-600)
      setMonthlyContribution(2500)
      setAnnualReturnRate(12.5)
    } else if (preset === 'transition') {
      setIncomeAdjPercent(-80)
      setExpenseAdjFixed(-1500)
      setMonthlyContribution(0)
      setAnnualReturnRate(10.0)
    }
  }

  function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(eventAmount)
    if (isNaN(amt) || amt <= 0 || !eventName.trim()) return

    const newEvt: SimulationEvent = {
      id: String(Date.now()),
      name: eventName.trim(),
      month: eventMonth,
      type: eventType,
      amount: amt,
    }
    setEvents((prev) => [...prev, newEvt])
    setEventName('')
    setEventAmount('')
  }

  function handleRemoveEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Planejamento Futuro & Simulador</h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Modo Sandbox
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Projete cenários financeiros de curto, médio e longo prazo sem alterar seus dados reais (Regra 5).
          </p>
        </div>

        {/* Pré-configurações Rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyPreset('conservative')}
            className="text-xs"
          >
            Conservador
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyPreset('realistic')}
            className="text-xs"
          >
            Realista
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyPreset('optimistic')}
            className="text-xs"
          >
            Otimista
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyPreset('transition')}
            className="text-xs text-amber-600"
          >
            Transição
          </Button>
        </div>
      </div>

      {/* Banner de Garantia Sandbox */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Ambiente Isolado de Simulação:</span> Todas as projeções são calculadas em tempo real na memória.
          Nenhuma transação, conta ou investimento é modificado no banco de dados. Sinta-se livre para testar qualquer hipótese.
        </div>
      </div>

      {/* KPIs da Simulação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Patrimônio Base Projetado</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatBRL(simulation.finalBaseNetWorth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            No ritmo atual em {horizonMonths} meses
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm border-primary/30">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-primary">Patrimônio no Cenário Simulado</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-primary">
            {formatBRL(simulation.finalSimulatedNetWorth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Com as decisões do sandbox aplicadas
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Diferencial Acumulado</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              simulation.netWorthGain >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive'
            }`}
          >
            {simulation.netWorthGain >= 0 ? '+' : ''}
            {formatBRL(simulation.netWorthGain)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {simulation.netWorthGain >= 0
              ? 'Ganho patrimonial líquido adicional'
              : 'Perda projetada no período'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Capacidade de Poupança / Mês</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatBRL(simulation.monthlySavingsSimulated)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sobra operacional mensal simulada
          </p>
        </div>
      </div>

      {/* Painel Central: Controles do Sandbox e Gráfico de Projeção */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controles */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 pb-2 border-b">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Parâmetros do Cenário</h2>
          </div>

          <div>
            <Label className="text-xs">Horizonte da Projeção</Label>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {[
                { months: 6, label: '6 Meses' },
                { months: 12, label: '1 Ano' },
                { months: 24, label: '2 Anos' },
                { months: 60, label: '5 Anos' },
              ].map((h) => (
                <button
                  key={h.months}
                  type="button"
                  onClick={() => setHorizonMonths(h.months)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md border text-center transition-all ${
                    horizonMonths === h.months
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <Label htmlFor="income-adj">Variação de Receitas (%)</Label>
              <span className="font-semibold text-primary">
                {incomeAdjPercent >= 0 ? `+${incomeAdjPercent}%` : `${incomeAdjPercent}%`}
              </span>
            </div>
            <Input
              id="income-adj"
              type="number"
              step="1"
              value={incomeAdjPercent}
              onChange={(e) => setIncomeAdjPercent(Number(e.target.value))}
              className="mt-1"
            />
            <span className="text-[11px] text-muted-foreground">
              Ex: +15% para aumento de salário ou -20% para perda de renda.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <Label htmlFor="expense-adj">Ajuste Mensal de Gastos (R$)</Label>
              <span className="font-semibold text-primary">
                {expenseAdjFixed >= 0 ? `+${expenseAdjFixed}` : `${expenseAdjFixed}`}
              </span>
            </div>
            <Input
              id="expense-adj"
              type="number"
              step="50"
              value={expenseAdjFixed}
              onChange={(e) => setExpenseAdjFixed(Number(e.target.value))}
              className="mt-1"
            />
            <span className="text-[11px] text-muted-foreground">
              Negativo = corte de gastos. Positivo = novo compromisso.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <Label htmlFor="contrib-adj">Aporte Mensal em Investimentos (R$)</Label>
              <span className="font-semibold text-emerald-600">
                {formatBRL(monthlyContribution)}
              </span>
            </div>
            <Input
              id="contrib-adj"
              type="number"
              step="50"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <Label htmlFor="return-rate">Rentabilidade Estimada dos Ativos (% a.a.)</Label>
              <span className="font-semibold text-primary">{annualReturnRate}% a.a.</span>
            </div>
            <Input
              id="return-rate"
              type="number"
              step="0.5"
              value={annualReturnRate}
              onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>

        {/* Gráfico Comparativo de Trajetória Patrimonial */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h2 className="font-semibold text-sm">Trajetória Patrimonial Comparada</h2>
                <p className="text-xs text-muted-foreground">
                  Cenário Base (sem mudanças) vs. Cenário Simulado Sandbox no horizonte de {horizonMonths} meses.
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulation.timeline}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baseTotalNetWorth"
                    name="Cenário Base"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="simulatedTotalNetWorth"
                    name="Cenário Simulado"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground flex justify-between items-center">
            <span>
              Saldo Inicial de Caixa + Investimentos: {formatBRL(summary.assetsBreakdown.cash + summary.assetsBreakdown.investments)}
            </span>
            <span className="font-medium text-foreground">
              Ganho Final em {horizonMonths} meses: {formatBRL(simulation.netWorthGain)}
            </span>
          </div>
        </div>
      </div>

      {/* Adição de Eventos Específicos / Extraordinários no Sandbox */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Eventos Avulsos & Choques de Caixa na Simulação</h2>
            <p className="text-xs text-muted-foreground">
              Simule a ocorrência de entradas ou saídas extraordinárias em meses futuros específicos.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddEvent} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <Label htmlFor="evt-name" className="text-xs">Descrição do Evento</Label>
            <Input
              id="evt-name"
              placeholder="Ex: 13º Salário, Troca de Carro, Bônus..."
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="evt-type" className="text-xs">Impacto</Label>
            <select
              id="evt-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'income' | 'expense')}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="income" className="bg-popover text-popover-foreground">
                Entrada (+ R$)
              </option>
              <option value="expense" className="bg-popover text-popover-foreground">
                Saída (- R$)
              </option>
            </select>
          </div>

          <div>
            <Label htmlFor="evt-month" className="text-xs">No Mês</Label>
            <Input
              id="evt-month"
              type="number"
              min="1"
              max={horizonMonths}
              value={eventMonth}
              onChange={(e) => setEventMonth(Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="evt-amt" className="text-xs">Valor (R$)</Label>
            <div className="flex gap-2">
              <Input
                id="evt-amt"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={eventAmount}
                onChange={(e) => setEventAmount(e.target.value)}
              />
              <Button type="submit" size="sm" className="shrink-0">
                + Inserir
              </Button>
            </div>
          </div>
        </form>

        {events.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {events.map((evt) => (
              <span
                key={evt.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs"
              >
                <span className="font-medium">{evt.name}</span>
                <span className="text-muted-foreground">(Mês {evt.month}):</span>
                <span
                  className={
                    evt.type === 'income'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-destructive font-semibold'
                  }
                >
                  {evt.type === 'income' ? '+' : '-'}
                  {formatBRL(evt.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(evt.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
