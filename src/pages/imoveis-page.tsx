import { useState, useMemo } from 'react'
import { useProperties, type PropertyWithCalculations } from '@/hooks/use-properties'
import { PropertyDialog } from '@/components/property-dialog'
import { AmortizationDialog } from '@/components/amortization-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { calculateSac, calculatePrice, simulateAmortization } from '@/lib/mortgage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Home,
  Plus,
  Building,
  TrendingDown,
  Clock,
  Sparkles,
  CheckCircle2,
  Receipt,
  Scale,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ImoveisPage() {
  const { properties, isLoading, deleteProperty } = useProperties()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyWithCalculations | null>(null)
  const [amortizationDialogOpen, setAmortizationDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'financing' | 'simulator' | 'down_payment' | 'history'>('financing')

  // Simulador interativo local
  const [simExtraAmount, setSimExtraAmount] = useState<number>(10000)

  // Imóvel ativo selecionado
  const activeProperty = useMemo(() => {
    if (properties.length === 0) return null
    if (!selectedPropertyId) return properties[0]
    return properties.find((p) => p.id === selectedPropertyId) || properties[0]
  }, [properties, selectedPropertyId])

  // Cronograma de Financiamento do imóvel selecionado
  const mortgageSchedule = useMemo(() => {
    if (!activeProperty || activeProperty.financed_amount <= 0) return null
    return activeProperty.amortization_system === 'sac'
      ? calculateSac(
          activeProperty.outstanding_balance,
          activeProperty.annual_interest_rate,
          activeProperty.remaining_months
        )
      : calculatePrice(
          activeProperty.outstanding_balance,
          activeProperty.annual_interest_rate,
          activeProperty.remaining_months
        )
  }, [activeProperty])

  // Simulação comparativa interativa: Prazo vs Parcela
  const termSim = useMemo(() => {
    if (!activeProperty || simExtraAmount <= 0) return null
    return simulateAmortization(
      activeProperty.outstanding_balance,
      activeProperty.annual_interest_rate,
      activeProperty.remaining_months,
      simExtraAmount,
      'term',
      activeProperty.amortization_system
    )
  }, [activeProperty, simExtraAmount])

  const installmentSim = useMemo(() => {
    if (!activeProperty || simExtraAmount <= 0) return null
    return simulateAmortization(
      activeProperty.outstanding_balance,
      activeProperty.annual_interest_rate,
      activeProperty.remaining_months,
      simExtraAmount,
      'installment',
      activeProperty.amortization_system
    )
  }, [activeProperty, simExtraAmount])

  function handleCreate() {
    setPropertyToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(prop: PropertyWithCalculations) {
    setPropertyToEdit(prop)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Gestão Imobiliária & Financiamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aquisição, entrada com construtora, evolução de obra (INCC), amortizações SAC/Price e Custo Efetivo Total.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {properties.length > 1 && (
            <select
              value={activeProperty?.id || ''}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <Button onClick={handleCreate} size="sm" className="text-xs">
            <Plus className="size-4 mr-1.5" />
            Novo Imóvel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
            </div>
          ))}
        </div>
      ) : !activeProperty ? (
        <EmptyState
          title="Nenhum imóvel cadastrado"
          description="Cadastre seu imóvel comprado na planta ou pronto para gerenciar a entrada, evolução de obra, financiamento e calcular a economia de amortizações extraordinárias."
          icon={Home}
          phase={4}
        />
      ) : (
        <div className="space-y-8">
          {/* Card Resumo do Imóvel Selecionado */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {activeProperty.name}
                  </h2>
                  <span className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground uppercase">
                    {activeProperty.status === 'under_construction'
                      ? 'Em Construção'
                      : activeProperty.status === 'ready'
                      ? 'Pronto'
                      : activeProperty.status === 'delivered'
                      ? 'Entregue'
                      : 'Negociação'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeProperty.builder ? `${activeProperty.builder} &middot; ` : ''}
                  {activeProperty.unit ? `Unidade ${activeProperty.unit} &middot; ` : ''}
                  Comprado em {formatDate(activeProperty.purchase_date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAmortizationDialogOpen(true)}
                className="text-xs font-semibold gap-1.5"
              >
                <Sparkles className="size-3.5 text-primary" />
                Amortizar Financiamento
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(activeProperty)}>
                    <Edit2 className="size-4 mr-2" />
                    Editar Imóvel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteProperty(activeProperty.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Painel Consolidado de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Custo Efetivo Total Estimado (CET) */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Custo Efetivo Total (CET)</span>
                <Scale className="size-4 text-primary" />
              </div>
              <div className="tabular text-2xl font-bold tracking-tight text-foreground">
                {formatBRL(activeProperty.cet_total_estimated)}
              </div>
              <p className="text-[11px] text-muted-foreground">Contrato + Juros + Obras + Custos</p>
            </div>

            {/* 2. Total Desembolsado até o Momento */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Total Desembolsado</span>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              <div className="tabular text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatBRL(activeProperty.total_disbursed)}
              </div>
              <p className="text-[11px] text-muted-foreground">Entrada paga + amortizações + taxas</p>
            </div>

            {/* 3. Saldo Devedor Financiamento */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Saldo Devedor Atual</span>
                <Receipt className="size-4 text-rose-500" />
              </div>
              <div className="tabular text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {formatBRL(activeProperty.outstanding_balance)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {activeProperty.remaining_months} meses restantes &middot;{' '}
                {activeProperty.amortization_system.toUpperCase()}
              </p>
            </div>

            {/* 4. Prestação Mensal Atual */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Prestação Atual</span>
                <Clock className="size-4 text-amber-500" />
              </div>
              <div className="tabular text-2xl font-bold tracking-tight text-foreground">
                {formatBRL(activeProperty.current_installment)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Taxa: {(activeProperty.annual_interest_rate * 100).toFixed(2)}% a.a.
              </p>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-2 border-b pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('financing')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'financing'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Financiamento & Tabela
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="size-3.5" />
              Simulador de Amortização
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('down_payment')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'down_payment'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrada & Obras
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Histórico de Amortizações ({activeProperty.amortizations.length})
            </button>
          </div>

          {/* Conteúdo das Abas */}
          {activeTab === 'financing' && mortgageSchedule && (
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Cronograma de Parcelas ({activeProperty.amortization_system.toUpperCase()})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Projeção das parcelas mensais detalhando amortização do principal vs. juros bancários.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Juros Totais Previstos: <strong className="text-foreground">{formatBRL(mortgageSchedule.totalInterestPaid)}</strong>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-md text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Mês</th>
                      <th className="py-2.5 px-3 text-right">Parcela</th>
                      <th className="py-2.5 px-3 text-right">Amortização</th>
                      <th className="py-2.5 px-3 text-right">Juros</th>
                      <th className="py-2.5 px-3 text-right">Saldo Devedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs tabular">
                    {mortgageSchedule.schedule.slice(0, 36).map((m) => (
                      <tr key={m.month} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold text-foreground">Mês {m.month}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatBRL(m.installment)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                          {formatBRL(m.amortization)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                          {formatBRL(m.interest)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {formatBRL(m.remainingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Exibindo as primeiras 36 parcelas do cronograma contratual.
              </p>
            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Simulador de Amortização Extraordinária (Prazo vs. Parcela)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simule o impacto de um aporte extraordinário no saldo devedor e compare a economia de juros entre abater no prazo ou na parcela.
                </p>
              </div>

              {/* Input de Valor para Simulação */}
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="sim-amount">Valor da Simulação (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="sim-amount"
                    type="number"
                    step="500"
                    min="100"
                    max={activeProperty.outstanding_balance}
                    value={simExtraAmount}
                    onChange={(e) => setSimExtraAmount(Number(e.target.value))}
                    className="pl-10 font-bold tabular text-base"
                  />
                </div>
              </div>

              {/* Comparativo Lado a Lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Opção 1: Redução de Prazo */}
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                      <Clock className="size-4" />
                      Estratégia 1: Reduzir Prazo
                    </span>
                    <span className="text-[11px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                      Maior Economia
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Economia Total de Juros:</span>
                      <div className="tabular text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {termSim ? formatBRL(termSim.interestSaved) : 'R$ 0,00'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-primary/20">
                      <div>
                        <span className="text-muted-foreground">Prazo Eliminado:</span>
                        <div className="tabular text-lg font-bold text-foreground">
                          {termSim?.monthsSaved ?? 0} meses
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Novo Prazo Restante:</span>
                        <div className="tabular text-lg font-bold text-foreground">
                          {termSim?.newMonthsRemaining ?? 0} meses
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                    Esta opção elimina diretamente as últimas parcelas do contrato (onde a incidência de juros compostos acumulados é maior), produzindo a máxima economia matemática de juros.
                  </p>
                </div>

                {/* Opção 2: Redução de Parcela */}
                <div className="rounded-2xl border bg-muted/20 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <TrendingDown className="size-4 text-amber-500" />
                      Estratégia 2: Reduzir Parcela
                    </span>
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                      Alívio Mensal
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Economia Total de Juros:</span>
                      <div className="tabular text-3xl font-extrabold text-foreground mt-0.5">
                        {installmentSim ? formatBRL(installmentSim.interestSaved) : 'R$ 0,00'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                      <div>
                        <span className="text-muted-foreground">Nova Parcela:</span>
                        <div className="tabular text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {installmentSim ? formatBRL(installmentSim.newInstallment) : 'R$ 0,00'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Redução Mensal:</span>
                        <div className="tabular text-lg font-bold text-foreground">
                          {installmentSim
                            ? formatBRL(
                                Math.max(0, installmentSim.oldInstallment - installmentSim.newInstallment)
                              )
                            : 'R$ 0,00'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                    Esta opção mantém a quantidade de meses do financiamento inalterada e reduz o valor cobrado a cada mês, liberando fluxo de caixa imediato no seu orçamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'down_payment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entrada Construtora */}
              <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-foreground">
                  Entrada com a Construtora
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Entrada Já Paga:</span>
                    <strong className="text-foreground">{formatBRL(activeProperty.down_payment_paid)}</strong>
                  </div>

                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${
                          activeProperty.down_payment_total > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (activeProperty.down_payment_paid /
                                    activeProperty.down_payment_total) *
                                    100
                                )
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Saldo Restante a Pagar:</span>
                    <strong className="text-rose-600 dark:text-rose-400">
                      {formatBRL(activeProperty.down_payment_remaining)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Entrada Total Contratada:</span>
                    <strong>{formatBRL(activeProperty.down_payment_total)}</strong>
                  </div>
                </div>
              </div>

              {/* Obras & Adicionais */}
              <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-foreground">
                  Evolução de Obra & Custos Adicionais
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b">
                    <span className="text-muted-foreground">Índice de Correção:</span>
                    <span className="font-bold bg-muted px-2 py-0.5 rounded">
                      {activeProperty.construction_index}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b">
                    <span className="text-muted-foreground">Juros de Obra Acumulados Pagos:</span>
                    <strong className="text-foreground">
                      {formatBRL(activeProperty.construction_fees_paid)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b">
                    <span className="text-muted-foreground">
                      Custos de Escritura, ITBI & Reforma:
                    </span>
                    <strong className="text-foreground">
                      {formatBRL(activeProperty.additional_costs_paid)}
                    </strong>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic pt-1">
                    Os juros de obra e tributos são custos irrecuperáveis que compõem o Custo Efetivo Total do imóvel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Histórico de Amortizações Extraordinárias
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aportes extraordinários abatidos diretamente do principal do saldo devedor.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setAmortizationDialogOpen(true)}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Nova Amortização
                </Button>
              </div>

              {activeProperty.amortizations.length === 0 ? (
                <div className="p-8 text-center border rounded-xl border-dashed">
                  <p className="text-xs text-muted-foreground">
                    Nenhuma amortização extraordinária registrada para este imóvel até o momento.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Estratégia</th>
                        <th className="py-2.5 px-3 text-right">Valor Aportado</th>
                        <th className="py-2.5 px-3 text-right">Juros Economizados</th>
                        <th className="py-2.5 px-3 text-right">Meses Reduzidos</th>
                        <th className="py-2.5 px-3">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs tabular">
                      {activeProperty.amortizations.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/30">
                          <td className="py-3 px-3 font-medium text-foreground">
                            {formatDate(a.date)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px]">
                              {a.reduction_type === 'term' ? 'Prazo' : 'Parcela'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-foreground">
                            {formatBRL(a.amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {a.interest_saved ? formatBRL(a.interest_saved) : '—'}
                          </td>
                          <td className="py-3 px-3 text-right text-foreground font-semibold">
                            {a.term_reduced ? `${a.term_reduced} meses` : '—'}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Regra Contábil do Imóvel */}
          <div className="rounded-2xl border bg-muted/20 p-5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Scale className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-foreground">
                Regra Contábil Imobiliária (Regra 1 e 6)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Um imóvel de R$ 300.000 com saldo financiado de R$ 240.000 representa R$ 60.000 de Patrimônio Líquido positivo.
                Toda amortização extraordinária de principal reduz o passivo na mesma proporção, enquanto juros pagos e evolução de obra são despesas financeiras operacionais.
              </p>
            </div>
          </div>

          {/* Diálogo de Amortização */}
          <AmortizationDialog
            open={amortizationDialogOpen}
            onOpenChange={setAmortizationDialogOpen}
            property={activeProperty}
          />
        </div>
      )}

      {/* Diálogo do Imóvel */}
      <PropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyToEdit={propertyToEdit}
      />
    </div>
  )
}
export { ImoveisPage }
