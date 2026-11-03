import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useVaults } from '@/hooks/use-vaults'
import { formatBRL } from '@/lib/money'
import {
  calculatePurchaseDecision,
  type PurchaseDecisionParams,
} from '@/lib/purchase-decision'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  TrendingUp,
  Percent,
  Sparkles,
  Flame,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Wallet,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react'

export default function SimuladoresPage() {
  const { transactions } = useTransactions()
  const { accounts } = useAccounts()
  const { vaults } = useVaults()

  const [activeTab, setActiveTab] = useState<
    'purchase' | 'compound' | 'amortization' | 'fire'
  >('purchase')

  // Contexto Financeiro Real do Usuário
  const realFinancialContext = useMemo(() => {
    // 1. Renda mensal estimada
    const incomes = transactions.filter((t) => t.kind === 'income' && t.status === 'completed')
    const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0)
    const avgMonthlyIncome = incomes.length > 0 ? Math.round(totalIncome / 3) : 8000

    // 2. Custos fixos estimados
    const fixedExpenses = transactions.filter(
      (t) => t.kind === 'expense' && t.expense_classification === 'fixed'
    )
    const totalFixed = fixedExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
    const avgMonthlyFixed = fixedExpenses.length > 0 ? Math.round(totalFixed / 3) : 4000

    // 3. Reservas líquidas disponíveis (contas correntes/digitais + cofres)
    const checkingBalance = accounts
      .filter((a) => !a.is_archived && a.type !== 'brokerage')
      .reduce((sum, a) => sum + (a.current_balance || 0), 0)

    const vaultsBalance = vaults.reduce((sum, v) => sum + (v.current_balance || 0), 0)
    const totalReserves = Math.max(1000, checkingBalance + vaultsBalance)

    return {
      monthlyIncome: Math.max(2000, avgMonthlyIncome),
      monthlyFixedCosts: Math.max(1000, avgMonthlyFixed),
      liquidReserves: totalReserves,
    }
  }, [transactions, accounts, vaults])

  // ==========================================
  // 1. Estados do Sandbox de Decisão de Compra
  // ==========================================
  const [purchaseName, setPurchaseName] = useState('Novo Computador de Trabalho')
  const [purchasePrice, setPurchasePrice] = useState<number>(8500)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'installments' | 'loan'>('installments')
  const [cashDiscountPercent, setCashDiscountPercent] = useState<number>(10)
  const [installmentsCount, setInstallmentsCount] = useState<number>(10)
  const [installmentsWithInterest, setInstallmentsWithInterest] = useState<boolean>(false)
  const [installmentsMonthlyInterest, setInstallmentsMonthlyInterest] = useState<number>(1.99)
  const [downPayment, setDownPayment] = useState<number>(2000)
  const [loanTermMonths, setLoanTermMonths] = useState<number>(24)
  const [loanMonthlyInterest, setLoanMonthlyInterest] = useState<number>(2.5)

  // Contexto editável
  const [customMonthlyIncome, setCustomMonthlyIncome] = useState<number>(realFinancialContext.monthlyIncome)
  const [customMonthlyFixedCosts, setCustomMonthlyFixedCosts] = useState<number>(realFinancialContext.monthlyFixedCosts)
  const [customReserves, setCustomReserves] = useState<number>(realFinancialContext.liquidReserves)

  // Cálculo da Decisão de Compra
  const decisionResult = useMemo(() => {
    const params: PurchaseDecisionParams = {
      purchaseName,
      purchasePrice,
      paymentMethod,
      cashDiscountPercent,
      installmentsCount,
      installmentsWithInterest,
      installmentsMonthlyInterest,
      downPayment,
      loanTermMonths,
      loanMonthlyInterest,
      monthlyIncome: customMonthlyIncome || realFinancialContext.monthlyIncome,
      monthlyFixedCosts: customMonthlyFixedCosts || realFinancialContext.monthlyFixedCosts,
      liquidReserves: customReserves || realFinancialContext.liquidReserves,
      annualBenchmarkRate: 11.5,
    }
    return calculatePurchaseDecision(params)
  }, [
    purchaseName,
    purchasePrice,
    paymentMethod,
    cashDiscountPercent,
    installmentsCount,
    installmentsWithInterest,
    installmentsMonthlyInterest,
    downPayment,
    loanTermMonths,
    loanMonthlyInterest,
    customMonthlyIncome,
    customMonthlyFixedCosts,
    customReserves,
    realFinancialContext,
  ])

  // ==========================================
  // 2. Estados do Simulador de Juros Compostos
  // ==========================================
  const [initialAmount, setInitialAmount] = useState<number>(10000)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1500)
  const [annualRate, setAnnualRate] = useState<number>(11.5)
  const [years, setYears] = useState<number>(10)

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

  // ==========================================
  // 3. Estados do Simulador de Amortização
  // ==========================================
  const [mortgageBalance, setMortgageBalance] = useState<number>(300000)
  const [mortgageRateAnnual, setMortgageRateAnnual] = useState<number>(10.5)
  const [extraPayment, setExtraPayment] = useState<number>(5000)

  const amortizationResult = useMemo(() => {
    const monthlyRate = mortgageRateAnnual / 100 / 12
    const estimatedInterestSaved = Math.round(extraPayment * monthlyRate * 12 * 5)
    return {
      interestSaved: estimatedInterestSaved,
      newBalance: Math.max(0, mortgageBalance - extraPayment),
    }
  }, [mortgageBalance, mortgageRateAnnual, extraPayment])

  // ==========================================
  // 4. Estados do Simulador FIRE
  // ==========================================
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(8000)
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState<number>(4.0)

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
            Simuladores & Decisões Financeiras
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modelos inteligentes de sandbox de fluxo de caixa, decisão de compra, juros compostos e amortização.
          </p>
        </div>
      </div>

      {/* Seletor de Simulador */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-muted/40 border">
        <button
          type="button"
          onClick={() => setActiveTab('purchase')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'purchase'
              ? 'bg-background text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingBag className="size-4 text-primary" />
          Decisão de Compra (Sandbox)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compound')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'fire'
              ? 'bg-background text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Flame className="size-4 text-amber-500" />
          Independência FIRE
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SIMULADOR DE DECISÃO DE COMPRA (SANDBOX DE FLUXO) */}
      {/* ========================================================= */}
      {activeTab === 'purchase' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna 1: Parâmetros da Compra (5 colunas) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b">
                <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShoppingBag className="size-5 text-primary" />
                  Planejar Aquisição
                </h2>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  Sandbox em Tempo Real
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="purchase-name">O que você pretende adquirir?</Label>
                  <Input
                    id="purchase-name"
                    value={purchaseName}
                    onChange={(e) => setPurchaseName(e.target.value)}
                    placeholder="Ex: Novo Smartphone, Reforma da Casa..."
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="purchase-price">Preço da Compra (R$) *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="purchase-price"
                      type="number"
                      min="1"
                      step="50"
                      value={purchasePrice || ''}
                      onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                      className="pl-9 font-bold text-lg tabular"
                    />
                  </div>
                </div>

                {/* Estratégia de Pagamento */}
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/50 border">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      À Vista
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('installments')}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        paymentMethod === 'installments'
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Parcelado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('loan')}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        paymentMethod === 'loan'
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Financiamento
                    </button>
                  </div>
                </div>

                {/* Detalhes para À Vista */}
                {paymentMethod === 'cash' && (
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <Label htmlFor="cash-disc">Desconto para Pagamento à Vista (%)</Label>
                        <span className="font-bold text-primary tabular">{cashDiscountPercent}%</span>
                      </div>
                      <Input
                        id="cash-disc"
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        value={cashDiscountPercent}
                        onChange={(e) => setCashDiscountPercent(Number(e.target.value) || 0)}
                        className="tabular"
                      />
                    </div>
                  </div>
                )}

                {/* Detalhes para Parcelado */}
                {paymentMethod === 'installments' && (
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <Label htmlFor="inst-count">Número de Parcelas</Label>
                        <span className="font-bold text-primary tabular">{installmentsCount}x</span>
                      </div>
                      <Input
                        id="inst-count"
                        type="number"
                        min="2"
                        max="36"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(Number(e.target.value) || 2)}
                        className="tabular"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="inst-interest-check"
                        checked={installmentsWithInterest}
                        onChange={(e) => setInstallmentsWithInterest(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary size-4"
                      />
                      <label htmlFor="inst-interest-check" className="text-xs text-muted-foreground cursor-pointer">
                        Parcelamento com juros da máquina/loja
                      </label>
                    </div>

                    {installmentsWithInterest && (
                      <div className="space-y-1.5 pt-1">
                        <Label htmlFor="inst-rate" className="text-xs">Taxa de Juros Mensal (% a.m.)</Label>
                        <Input
                          id="inst-rate"
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={installmentsMonthlyInterest}
                          onChange={(e) => setInstallmentsMonthlyInterest(Number(e.target.value) || 0)}
                          className="tabular"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Detalhes para Financiamento / CDC */}
                {paymentMethod === 'loan' && (
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="loan-down" className="text-xs">Entrada (R$)</Label>
                        <Input
                          id="loan-down"
                          type="number"
                          step="100"
                          value={downPayment}
                          onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
                          className="tabular"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="loan-term" className="text-xs">Prazo (Meses)</Label>
                        <Input
                          id="loan-term"
                          type="number"
                          min="3"
                          max="120"
                          value={loanTermMonths}
                          onChange={(e) => setLoanTermMonths(Number(e.target.value) || 12)}
                          className="tabular"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="loan-rate" className="text-xs">Taxa de Juros Mensal (% a.m.)</Label>
                      <Input
                        id="loan-rate"
                        type="number"
                        step="0.05"
                        min="0.5"
                        value={loanMonthlyInterest}
                        onChange={(e) => setLoanMonthlyInterest(Number(e.target.value) || 1.99)}
                        className="tabular"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ajustes do Contexto Financeiro Real */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-primary" />
                  Seu Balanço de Referência
                </span>
                <span className="text-[11px] text-muted-foreground">Ajustável</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Renda Líquida</span>
                  <Input
                    type="number"
                    step="100"
                    value={customMonthlyIncome}
                    onChange={(e) => setCustomMonthlyIncome(Number(e.target.value) || 0)}
                    className="h-8 text-xs font-semibold tabular"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Custos Fixos</span>
                  <Input
                    type="number"
                    step="100"
                    value={customMonthlyFixedCosts}
                    onChange={(e) => setCustomMonthlyFixedCosts(Number(e.target.value) || 0)}
                    className="h-8 text-xs font-semibold tabular"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Reserva Atual</span>
                  <Input
                    type="number"
                    step="500"
                    value={customReserves}
                    onChange={(e) => setCustomReserves(Number(e.target.value) || 0)}
                    className="h-8 text-xs font-semibold tabular"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Veredito e Impacto (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card de Veredito Inteligente */}
            <div
              className={`rounded-2xl border p-6 shadow-sm transition-all space-y-4 ${
                decisionResult.verdict.level === 'safe'
                  ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20'
                  : decisionResult.verdict.level === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20'
                  : 'border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      decisionResult.verdict.level === 'safe'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : decisionResult.verdict.level === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {decisionResult.verdict.level === 'safe' ? (
                      <ShieldCheck className="size-6" />
                    ) : decisionResult.verdict.level === 'warning' ? (
                      <AlertTriangle className="size-6" />
                    ) : (
                      <ShieldAlert className="size-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {decisionResult.verdict.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {decisionResult.verdict.summary}
                    </p>
                  </div>
                </div>

                <Badge
                  className={`text-xs font-bold uppercase ${
                    decisionResult.verdict.level === 'safe'
                      ? 'bg-emerald-500 text-white'
                      : decisionResult.verdict.level === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {decisionResult.verdict.level === 'safe'
                    ? 'Luz Verde'
                    : decisionResult.verdict.level === 'warning'
                    ? 'Luz Amarela'
                    : 'Luz Vermelha'}
                </Badge>
              </div>

              {/* Razões e Dicas */}
              <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                {decisionResult.verdict.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-foreground">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </div>
                ))}
                {decisionResult.verdict.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-muted-foreground italic">
                    <span>💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid de Impacto no Caixa e Reserva */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Valor Final & Parcela */}
              <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Desembolso da Compra
                </span>
                <div className="tabular text-2xl font-bold text-foreground">
                  {formatBRL(decisionResult.finalPrice)}
                </div>
                {paymentMethod !== 'cash' ? (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      <strong>{decisionResult.totalPayments}x de {formatBRL(decisionResult.monthlyPayment)}</strong>
                    </p>
                    <p>Compromete <strong>{decisionResult.monthlyIncomeCommitmentPercent}%</strong> da sua renda mensal.</p>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {decisionResult.immediateSavings > 0 ? (
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Economia imediata de {formatBRL(decisionResult.immediateSavings)}
                      </p>
                    ) : (
                      <p>Pagamento integral à vista sem desconto.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Impacto na Sobra do Mês */}
              <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sobra Mensal Estimada
                </span>
                <div
                  className={`tabular text-2xl font-bold ${
                    decisionResult.projectedMonthlySurplus < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-foreground'
                  }`}
                >
                  {formatBRL(decisionResult.projectedMonthlySurplus)}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>Antes da compra: {formatBRL(decisionResult.currentMonthlySurplus)}/mês.</span>
                </div>
              </div>

              {/* Card 3: Proteção da Reserva de Emergência */}
              <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cobertura da Reserva
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-2xl font-bold text-foreground">
                    {decisionResult.reservesCoverageAfterMonths} meses
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (antes: {decisionResult.reservesCoverageBeforeMonths} meses)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Saldo restante protegido: <strong>{formatBRL(decisionResult.remainingReserves)}</strong>
                </p>
              </div>

              {/* Card 4: Custo de Oportunidade */}
              <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Custo de Oportunidade (12m)
                </span>
                <div className="tabular text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatBRL(decisionResult.opportunityCost12Months)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rendimento aproximado do valor se mantido a 100% do CDI no período.
                </p>
              </div>
            </div>

            {/* Comparativo Estratégico & Ação */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Estratégia Recomendada
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {decisionResult.bestOptionRecommendation === 'cash' ? 'Prefira À Vista' : 'Prefira Parcelar sem Juros'}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {decisionResult.bestOptionRecommendation === 'cash' ? (
                  <>
                    O desconto obtido no pagamento à vista supera o rendimento que o dinheiro teria aplicado no CDI durante o período das parcelas. <strong>Pagar à vista é a melhor escolha matemática!</strong>
                  </>
                ) : (
                  <>
                    Como o desconto à vista é baixo (ou nulo) e o parcelamento não tem juros abusivos, <strong>manter o dinheiro investido num cofre ou reserva e pagar as parcelas mês a mês</strong> renderá mais capital.
                  </>
                )}
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">Quer poupar antes de comprar?</span>
                <Link to="/metas">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    <PiggyBank className="size-3.5 text-primary" />
                    Cadastrar como Meta Planejada
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: JUROS COMPOSTOS */}
      {/* ========================================================= */}
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
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-monthly">Aporte Mensal (R$)</Label>
                <Input
                  id="c-monthly"
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-rate">Rentabilidade Anual Estimada (%)</Label>
                <Input
                  id="c-rate"
                  type="number"
                  step="0.1"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-years">Prazo em Anos</Label>
                <Input
                  id="c-years"
                  type="number"
                  min="1"
                  max="50"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value) || 1)}
                  className="tabular"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-emerald-500/5 p-6 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Patrimônio Acumulado em {years} anos
                </span>
                <div className="tabular text-3xl sm:text-4xl font-extrabold text-foreground mt-1">
                  {formatBRL(compoundResult.totalAccumulated)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-xs text-muted-foreground">Total Investido do Bolso</span>
                  <div className="tabular text-lg font-bold text-foreground">
                    {formatBRL(compoundResult.totalInvested)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total Ganho em Juros</span>
                  <div className="tabular text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatBRL(compoundResult.totalInterest)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: AMORTIZAÇÃO ANTECIPADA */}
      {/* ========================================================= */}
      {activeTab === 'amortization' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <Percent className="size-5 text-primary" />
              Parâmetros do Financiamento
            </h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-bal">Saldo Devedor Atual (R$)</Label>
                <Input
                  id="m-bal"
                  type="number"
                  value={mortgageBalance}
                  onChange={(e) => setMortgageBalance(Number(e.target.value) || 0)}
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-rate">Taxa de Juros Anual (%)</Label>
                <Input
                  id="m-rate"
                  type="number"
                  step="0.1"
                  value={mortgageRateAnnual}
                  onChange={(e) => setMortgageRateAnnual(Number(e.target.value) || 0)}
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-extra">Valor da Amortização Extra (R$)</Label>
                <Input
                  id="m-extra"
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
                  className="tabular"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Economia Estimada em Juros Futuros
                </span>
                <div className="tabular text-3xl font-bold text-foreground mt-1">
                  ~{formatBRL(amortizationResult.interestSaved)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cada R$ amortizado diretamente no principal deixa de gerar juros por todo o período restante.
                </p>
              </div>

              <div className="pt-4 border-t">
                <span className="text-xs text-muted-foreground">Novo Saldo Devedor</span>
                <div className="tabular text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatBRL(amortizationResult.newBalance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: INDEPENDÊNCIA FIRE */}
      {/* ========================================================= */}
      {activeTab === 'fire' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <Flame className="size-5 text-amber-500" />
              Parâmetros de Independência
            </h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-cost">Custo de Vida Mensal Desejado (R$)</Label>
                <Input
                  id="f-cost"
                  type="number"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
                  className="tabular"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-rate">Taxa Segura de Retirada (Regra dos 4%)</Label>
                <Input
                  id="f-rate"
                  type="number"
                  step="0.1"
                  value={safeWithdrawalRate}
                  onChange={(e) => setSafeWithdrawalRate(Number(e.target.value) || 4.0)}
                  className="tabular"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-amber-500/5 p-6 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Patrimônio Necessário para Aposentadoria (FIRE Number)
                </span>
                <div className="tabular text-3xl sm:text-4xl font-extrabold text-foreground mt-1">
                  {formatBRL(fireResult.targetFire)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor investido gerando renda passiva perpétua sem consumir o principal.
                </p>
              </div>

              <div className="pt-4 border-t">
                <span className="text-xs text-muted-foreground">Renda Mensal Passiva Gerada</span>
                <div className="tabular text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(fireResult.safeMonthlyIncome)} / mês
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
