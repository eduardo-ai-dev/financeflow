import { useState, useMemo } from 'react'
import { useInvestments, type InvestmentWithStats } from '@/hooks/use-investments'
import { formatCurrency, formatBRL } from '@/lib/money'
import { InvestmentDialog } from '@/components/investment-dialog'
import { InvestmentTransactionDialog } from '@/components/investment-transaction-dialog'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Building,
  Edit2,
  Trash2,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  fixed_income: '#10b981', // Verde
  stocks: '#3b82f6', // Azul
  reits: '#f59e0b', // Laranja
  etf: '#8b5cf6', // Roxo
  crypto: '#ec4899', // Rosa
  funds: '#06b6d4', // Ciano
  pension: '#6366f1', // Índigo
  other: '#64748b', // Cinza
}

const TYPE_LABELS: Record<string, string> = {
  fixed_income: 'Renda Fixa',
  stocks: 'Ações',
  reits: 'FIIs',
  etf: 'ETFs / Exterior',
  crypto: 'Cripto',
  funds: 'Fundos',
  pension: 'Previdência',
  other: 'Outros',
}

export default function InvestimentosPage() {
  const { investments, transactions, isLoading, deleteInvestment } = useInvestments()

  // Modais
  const [invDialogOpen, setInvDialogOpen] = useState(false)
  const [editingInv, setEditingInv] = useState<InvestmentWithStats | null>(null)
  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [selectedInvForTx, setSelectedInvForTx] = useState<InvestmentWithStats | null>(null)
  const [txDefaultType, setTxDefaultType] = useState<
    'contribution' | 'redemption' | 'dividend' | 'yield'
  >('contribution')

  // Agregações
  const totalCurrent = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.current_amount, 0),
    [investments]
  )
  const totalCost = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.total_invested, 0),
    [investments]
  )
  const totalProfit = totalCurrent - totalCost
  const totalProfitPercent =
    totalCost > 0 ? Math.round((totalProfit / totalCost) * 10000) / 100 : 0

  const totalDividends = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'dividend' || t.type === 'interest_on_equity')
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  // Gráfico por classe
  const allocationData = useMemo(() => {
    const classMap: Record<string, number> = {}
    investments.forEach((inv) => {
      classMap[inv.type] = (classMap[inv.type] || 0) + inv.current_amount
    })

    return Object.entries(classMap)
      .map(([type, amount]) => ({
        name: TYPE_LABELS[type] || type,
        value: amount,
        color: TYPE_COLORS[type] || '#64748b',
        percent: totalCurrent > 0 ? Math.round((amount / totalCurrent) * 100) : 0,
      }))
      .filter((item) => item.value > 0)
  }, [investments, totalCurrent])

  function handleOpenNew() {
    setEditingInv(null)
    setInvDialogOpen(true)
  }

  function handleEdit(inv: InvestmentWithStats) {
    setEditingInv(inv)
    setInvDialogOpen(true)
  }

  function handleOpenTx(
    inv: InvestmentWithStats,
    type: 'contribution' | 'redemption' | 'dividend' | 'yield'
  ) {
    setSelectedInvForTx(inv)
    setTxDefaultType(type)
    setTxDialogOpen(true)
  }

  async function handleDelete(inv: InvestmentWithStats) {
    if (confirm(`Tem certeza que deseja remover o investimento "${inv.name}"?`)) {
      await deleteInvestment(inv.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investimentos & Carteira</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a rentabilidade real e evolução patrimonial. Aportes são tratados como transferências patrimoniais sem inflar despesas de consumo.
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Investimento
        </Button>
      </div>

      {/* KPIs da Carteira */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Patrimônio Investido</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(totalCurrent)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {investments.length} ativo{investments.length !== 1 ? 's' : ''} na carteira
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Custo Total Aportado</span>
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(totalCost)}</div>
          <p className="text-xs text-muted-foreground mt-1">Capital aportado acumulado</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Rentabilidade Histórica</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              totalProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive'
            }`}
          >
            {totalProfit >= 0 ? '+' : ''}
            {formatCurrency(totalProfit)}
          </div>
          <p
            className={`text-xs mt-1 ${
              totalProfitPercent >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive'
            }`}
          >
            {totalProfitPercent >= 0 ? '+' : ''}
            {totalProfitPercent}% de valorização
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Proventos Recebidos</span>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalDividends)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Dividendos e Juros s/ Capital</p>
        </div>
      </div>

      {/* Gráfico de Alocação e Resumo */}
      {allocationData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <PieIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Alocação por Classe</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-sm mb-2">Diversificação da Carteira</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {allocationData.map((item) => (
                  <div key={item.name} className="p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-sm">{formatCurrency(item.value)}</div>
                    <span className="text-xs text-muted-foreground">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Regra 4 ativa: Operações de compra e venda não geram falsos déficits no orçamento.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Investimentos */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">Ativos em Carteira</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Posições abertas com rentabilidade estimada e histórico de proventos.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Carregando investimentos...
          </div>
        ) : investments.length === 0 ? (
          <div className="p-10 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
            <h3 className="font-semibold text-lg">Sua carteira de investimentos está vazia</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
              Cadastre seus ativos de renda fixa, fundos ou ações para acompanhar seu crescimento patrimonial real.
            </p>
            <Button onClick={handleOpenNew} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Cadastrar Primeiro Ativo
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-medium text-left border-b">
                <tr>
                  <th className="py-3 px-4">Ativo / Código</th>
                  <th className="py-3 px-4">Classe</th>
                  <th className="py-3 px-4">Instituição</th>
                  <th className="py-3 px-4 text-right">Custo Aportado</th>
                  <th className="py-3 px-4 text-right">Saldo Atual</th>
                  <th className="py-3 px-4 text-right">Rentabilidade</th>
                  <th className="py-3 px-4 text-center">Ações Rápidas</th>
                  <th className="py-3 px-4 text-right">Gerenciar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {investments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{inv.name}</div>
                      {inv.ticker && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {inv.ticker}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: TYPE_COLORS[inv.type] || '#64748b' }}
                        />
                        {TYPE_LABELS[inv.type] || inv.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{inv.institution}</td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {formatCurrency(inv.total_invested)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-foreground">
                      {formatCurrency(inv.current_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className={`font-semibold text-xs ${
                          inv.profit_amount >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive'
                        }`}
                      >
                        {inv.profit_amount >= 0 ? '+' : ''}
                        {formatCurrency(inv.profit_amount)}
                      </div>
                      <div
                        className={`text-[11px] ${
                          inv.profit_percent >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive'
                        }`}
                      >
                        {inv.profit_percent >= 0 ? '+' : ''}
                        {inv.profit_percent}%
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleOpenTx(inv, 'contribution')}
                          title="Aportar"
                        >
                          <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                          Aporte
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleOpenTx(inv, 'redemption')}
                          title="Resgatar"
                        >
                          <ArrowDownLeft className="h-3 w-3 text-destructive" />
                          Resgate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleOpenTx(inv, 'dividend')}
                          title="Lançar Dividendos"
                        >
                          <Coins className="h-3 w-3 text-amber-500" />
                          Provento
                        </Button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(inv)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(inv)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <InvestmentDialog
        open={invDialogOpen}
        onOpenChange={setInvDialogOpen}
        investmentToEdit={editingInv}
      />

      <InvestmentTransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        investment={selectedInvForTx}
        defaultType={txDefaultType}
      />
    </div>
  )
}
