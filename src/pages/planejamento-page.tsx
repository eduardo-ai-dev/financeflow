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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card'
import {
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  Info,
  Calendar,
  Layers,
  HelpCircle,
  Shield,
  Target,
  Rocket,
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

type ScenarioPresetKey = 'conservative' | 'realistic' | 'optimistic' | 'custom'

interface ScenarioGuideItem {
  key: Exclude<ScenarioPresetKey, 'custom'>
  label: string
  tagline: string
  description: string
  paramsLabel: string
  incomeAdj: number
  expenseAdj: number
  contribution: number
  returnRate: number
}

const SCENARIO_PRESETS: ScenarioGuideItem[] = [
  {
    key: 'conservative',
    label: 'Conservador',
    tagline: 'Foco em proteção e margem de segurança',
    description:
      'Considera renda estável sem aumentos, acréscimo preventivo nos gastos mensais para imprevistos, aportes moderados e rentabilidade cautelosa.',
    paramsLabel: 'Renda 0% · Gastos +R$ 300/mês · Aporte R$ 400 · Retorno 9,0% a.a.',
    incomeAdj: 0,
    expenseAdj: 300,
    contribution: 400,
    returnRate: 9.0,
  },
  {
    key: 'realistic',
    label: 'Realista',
    tagline: 'Equilíbrio saudável e evolução consistente',
    description:
      'Projeta crescimento gradual da renda, otimização moderada de despesas recorrentes, disciplina constante de aportes e retorno alinhado ao mercado.',
    paramsLabel: 'Renda +5% · Gastos -R$ 200/mês · Aporte R$ 1.000 · Retorno 10,5% a.a.',
    incomeAdj: 5,
    expenseAdj: -200,
    contribution: 1000,
    returnRate: 10.5,
  },
  {
    key: 'optimistic',
    label: 'Otimista',
    tagline: 'Aceleração máxima de patrimônio',
    description:
      'Simula expansão expressiva de receitas (promoção ou novos negócios), enxugamento forte de custos fixos, aportes elevados e carteira com maior retorno.',
    paramsLabel: 'Renda +20% · Gastos -R$ 600/mês · Aporte R$ 2.500 · Retorno 12,5% a.a.',
    incomeAdj: 20,
    expenseAdj: -600,
    contribution: 2500,
    returnRate: 12.5,
  },
]

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

  // Parâmetros da Simulação (padrão inicial: Realista)
  const [activePreset, setActivePreset] = useState<ScenarioPresetKey>('realistic')
  const [horizonMonths, setHorizonMonths] = useState<number>(12)
  const [incomeAdjPercent, setIncomeAdjPercent] = useState<number>(5)
  const [expenseAdjFixed, setExpenseAdjFixed] = useState<number>(-200)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1000)
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(10.5)
  const [events, setEvents] = useState<SimulationEvent[]>([])

  // Novo evento avulso
  const [eventMonth, setEventMonth] = useState<number>(6)
  const [eventAmount, setEventAmount] = useState<string>('5000')
  const [eventName, setEventName] = useState<string>('Bônus / 13º Salário')
  const [eventType, setEventType] = useState<'income' | 'expense'>('income')

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

  function applyPreset(presetKey: Exclude<ScenarioPresetKey, 'custom'>) {
    const found = SCENARIO_PRESETS.find((p) => p.key === presetKey)
    if (!found) return
    setActivePreset(presetKey)
    setIncomeAdjPercent(found.incomeAdj)
    setExpenseAdjFixed(found.expenseAdj)
    setMonthlyContribution(found.contribution)
    setAnnualReturnRate(found.returnRate)
  }

  function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(eventAmount)
    if (Number.isNaN(amt) || amt <= 0 || !eventName.trim()) return

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

  const activeScenarioInfo = SCENARIO_PRESETS.find((p) => p.key === activePreset)

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho e Seletor de Cenários */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-3 border-b">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Planejamento Futuro
            </h1>
            <Badge variant="success">Simulação Livre</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Projete a evolução do seu patrimônio em diferentes horizontes sem afetar seus saldos reais.
          </p>
        </div>

        {/* Seletor de Cenários + HoverCard Informativo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Cenários:</span>
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.key
            return (
              <Button
                key={preset.key}
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => applyPreset(preset.key)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            )
          })}

          <HoverCard openDelay={120} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
                aria-label="Entenda como funciona cada cenário de planejamento"
                title="Entenda os cenários"
              >
                <HelpCircle className="size-4" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-88 sm:w-96 p-4 space-y-3">
              <div className="space-y-0.5 pb-2 border-b">
                <h4 className="text-sm font-semibold text-foreground">
                  Como funcionam os Cenários?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Escolha um ponto de partida rápido ou personalize os controles livremente.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                    <Shield className="size-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Conservador</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Mantém sua renda atual estável, adiciona margem extra para imprevistos nos gastos e projeta retorno cauteloso (9,0% a.a.).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Target className="size-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Realista</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Considera reajuste gradual de renda (+5%), redução leve de despesas (-R$ 200/mês) e aportes mensais constantes (10,5% a.a.).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                    <Rocket className="size-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Otimista</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Simula crescimento acelerado de receita (+20%), corte expressivo de custos (-R$ 600/mês) e alta capacidade de aporte (12,5% a.a.).
                    </p>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>

      {/* Alert Discreto Explicativo dos Cenários */}
      <Alert variant="subtle">
        <Info className="size-4" />
        <AlertTitle className="flex items-center gap-2 flex-wrap">
          <span>
            {activeScenarioInfo
              ? `Cenário ${activeScenarioInfo.label}: ${activeScenarioInfo.tagline}`
              : 'Cenário Personalizado'}
          </span>
          {activeScenarioInfo && (
            <span className="text-[11px] font-normal text-muted-foreground tabular">
              ({activeScenarioInfo.paramsLabel})
            </span>
          )}
        </AlertTitle>
        <AlertDescription>
          <p>
            {activeScenarioInfo
              ? activeScenarioInfo.description
              : 'Você ajustou manualmente as premissas de receita, gastos ou investimentos. Use os botões Conservador, Realista ou Otimista acima (ou passe o mouse no ícone "?") para comparar estratégias.'}
          </p>
        </AlertDescription>
      </Alert>

      {/* KPIs da Simulação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Ritmo Atual
            </span>
            <Calendar className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 tabular text-2xl font-bold">
            {formatBRL(simulation.finalBaseNetWorth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Projeção mantendo o padrão atual em {horizonMonths} meses
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs border-primary/30">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Patrimônio Projetado
            </span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="mt-2 tabular text-2xl font-black text-primary">
            {formatBRL(simulation.finalSimulatedNetWorth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Estimativa com o cenário selecionado
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Diferença Acumulada
            </span>
            <Sparkles className="size-4 text-emerald-500" />
          </div>
          <div
            className={`mt-2 tabular text-2xl font-bold ${
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
              ? 'Evolução adicional frente ao ritmo atual'
              : 'Redução frente ao ritmo atual'}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Saldo Livre Mensal
            </span>
            <Layers className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 tabular text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatBRL(simulation.monthlySavingsSimulated)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Capacidade mensal estimada de poupança
          </p>
        </div>
      </div>

      {/* Painel Central: Controles e Gráfico de Projeção */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controles */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 pb-2 border-b">
            <SlidersHorizontal className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">Premissas da Projeção</h2>
          </div>

          <div>
            <Label className="text-xs">Horizonte de Tempo</Label>
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
                  className={`px-2 py-1.5 text-xs font-medium rounded-md border text-center transition-all cursor-pointer ${
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
            <div className="flex justify-between text-xs tabular">
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
              onChange={(e) => {
                setActivePreset('custom')
                setIncomeAdjPercent(Number(e.target.value))
              }}
              className="mt-1 tabular"
            />
            <span className="text-[11px] text-muted-foreground">
              Ex.: +15% para aumento de renda ou -20% para redução.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs tabular">
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
              onChange={(e) => {
                setActivePreset('custom')
                setExpenseAdjFixed(Number(e.target.value))
              }}
              className="mt-1 tabular"
            />
            <span className="text-[11px] text-muted-foreground">
              Valores negativos representam economia; positivos, novos gastos.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs tabular">
              <Label htmlFor="contrib-adj">Aporte Mensal Investido (R$)</Label>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatBRL(monthlyContribution)}
              </span>
            </div>
            <Input
              id="contrib-adj"
              type="number"
              step="50"
              value={monthlyContribution}
              onChange={(e) => {
                setActivePreset('custom')
                setMonthlyContribution(Number(e.target.value))
              }}
              className="mt-1 tabular"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs tabular">
              <Label htmlFor="return-rate">Rentabilidade Anual Estimada (% a.a.)</Label>
              <span className="font-semibold text-primary">{annualReturnRate}% a.a.</span>
            </div>
            <Input
              id="return-rate"
              type="number"
              step="0.5"
              value={annualReturnRate}
              onChange={(e) => {
                setActivePreset('custom')
                setAnnualReturnRate(Number(e.target.value))
              }}
              className="mt-1 tabular"
            />
          </div>
        </div>

        {/* Gráfico Comparativo de Trajetória Patrimonial */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h2 className="font-semibold text-sm">Evolução Patrimonial Comparada</h2>
                <p className="text-xs text-muted-foreground">
                  Comparativo entre manter o ritmo atual e aplicar o cenário escolhido ao longo de {horizonMonths} meses.
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
                    name="Ritmo Atual"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="simulatedTotalNetWorth"
                    name="Cenário Projetado"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 tabular">
            <span>
              Ponto de Partida (Caixa + Investimentos):{' '}
              {formatBRL(summary.assetsBreakdown.cash + summary.assetsBreakdown.investments)}
            </span>
            <span className="font-medium text-foreground">
              Diferença projetada em {horizonMonths} meses: {formatBRL(simulation.netWorthGain)}
            </span>
          </div>
        </div>
      </div>

      {/* Eventos Planejados / Extraordinários */}
      <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Eventos Futuros Planejados</h2>
            <p className="text-xs text-muted-foreground">
              Inclua entradas ou gastos pontuais (como 13º salário, bônus, viagem ou compra de veículo) em meses específicos.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddEvent} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <Label htmlFor="evt-name" className="text-xs">
              Descrição do Evento
            </Label>
            <Input
              id="evt-name"
              placeholder="Ex.: 13º Salário, Viagem em Família, Bônus..."
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="evt-type" className="text-xs">
              Tipo
            </Label>
            <select
              id="evt-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'income' | 'expense')}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-2xs"
            >
              <option value="income">Entrada (+ R$)</option>
              <option value="expense">Saída (- R$)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="evt-month" className="text-xs">
              Mês da Projeção
            </Label>
            <Input
              id="evt-month"
              type="number"
              min="1"
              max={horizonMonths}
              value={eventMonth}
              onChange={(e) => setEventMonth(Number(e.target.value))}
              className="tabular"
            />
          </div>

          <div>
            <Label htmlFor="evt-amt" className="text-xs">
              Valor (R$)
            </Label>
            <div className="flex gap-2">
              <Input
                id="evt-amt"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={eventAmount}
                onChange={(e) => setEventAmount(e.target.value)}
                className="tabular"
              />
              <Button type="submit" size="sm" className="shrink-0">
                + Incluir
              </Button>
            </div>
          </div>
        </form>

        {events.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {events.map((evt) => (
              <span
                key={evt.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs tabular"
              >
                <span className="font-medium">{evt.name}</span>
                <span className="text-muted-foreground">(Mês {evt.month}):</span>
                <span
                  className={
                    evt.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-destructive font-semibold'
                  }
                >
                  {evt.type === 'income' ? '+' : '-'}
                  {formatBRL(evt.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(evt.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
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
