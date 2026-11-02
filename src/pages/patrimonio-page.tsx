import { useState, useMemo } from 'react'
import { usePatrimony } from '@/hooks/use-patrimony'
import { formatCurrency, formatBRL } from '@/lib/money'
import { AssetDialog } from '@/components/asset-dialog'
import { LiabilityDialog } from '@/components/liability-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Asset, Liability } from '@/types/database'
import { useAssets } from '@/hooks/use-assets'
import { useLiabilities } from '@/hooks/use-liabilities'
import {
  Scale,
  Plus,
  ShieldCheck,
  TrendingDown,
  Building,
  Car,
  Laptop,
  Coins,
  ArrowRight,
  Edit2,
  Trash2,
  PieChart as PieIcon,
  Layers,
  FileText,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Link } from 'react-router-dom'

const ASSET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
const LIABILITY_COLORS = ['#ef4444', '#f97316', '#e11d48']

export default function PatrimonioPage() {
  const { summary, properties, isLoading } = usePatrimony()
  const { assets, deleteAsset } = useAssets()
  const { liabilities, deleteLiability } = useLiabilities()

  const [confirmDeleteAssetId, setConfirmDeleteAssetId] = useState<string | null>(null)
  const [confirmDeleteLiabId, setConfirmDeleteLiabId] = useState<string | null>(null)

  // Modais
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [liabDialogOpen, setLiabDialogOpen] = useState(false)
  const [editingLiab, setEditingLiab] = useState<Liability | null>(null)

  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities' | 'properties'>('assets')

  const assetsPieData = useMemo(() => {
    return [
      { name: 'Caixa Livre', value: summary.assetsBreakdown.cash, color: '#3b82f6' },
      { name: 'Investimentos', value: summary.assetsBreakdown.investments, color: '#10b981' },
      { name: 'Bens & Ativos', value: summary.assetsBreakdown.physicalAssets, color: '#f59e0b' },
      { name: 'Imóveis', value: summary.assetsBreakdown.realEstate, color: '#8b5cf6' },
    ].filter((item) => item.value > 0)
  }, [summary.assetsBreakdown])

  const liabilitiesPieData = useMemo(() => {
    return [
      {
        name: 'Financ. Imobiliário',
        value: summary.liabilitiesBreakdown.mortgages,
        color: '#ef4444',
      },
      {
        name: 'Empréstimos / Dívidas',
        value: summary.liabilitiesBreakdown.loansAndDebts,
        color: '#f97316',
      },
      {
        name: 'Faturas de Cartão',
        value: summary.liabilitiesBreakdown.creditCard,
        color: '#e11d48',
      },
    ].filter((item) => item.value > 0)
  }, [summary.liabilitiesBreakdown])

  function handleOpenNewAsset() {
    setEditingAsset(null)
    setAssetDialogOpen(true)
  }

  function handleEditAsset(a: Asset) {
    setEditingAsset(a)
    setAssetDialogOpen(true)
  }

  async function handleConfirmDeleteAsset(id: string) {
    await deleteAsset(id)
    setConfirmDeleteAssetId(null)
  }

  function handleOpenNewLiab() {
    setEditingLiab(null)
    setLiabDialogOpen(true)
  }

  function handleEditLiab(l: Liability) {
    setEditingLiab(l)
    setLiabDialogOpen(true)
  }

  async function handleConfirmDeleteLiab(id: string) {
    await deleteLiability(id)
    setConfirmDeleteLiabId(null)
  }

  function getAssetIcon(type: string) {
    switch (type) {
      case 'vehicle':
        return <Car className="h-4 w-4" />
      case 'electronics':
        return <Laptop className="h-4 w-4" />
      case 'real_estate':
        return <Building className="h-4 w-4" />
      default:
        return <Layers className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Balanço Patrimonial
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada do seu patrimônio real: Ativos Totais menos Passivos e Obrigações (Regra 1 do README).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenNewLiab} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            + Obrigação / Passivo
          </Button>
          <Button size="sm" onClick={handleOpenNewAsset} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            + Bem Patrimonial
          </Button>
        </div>
      </div>

      {/* KPIs do Patrimônio Líquido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs border-primary/30">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Patrimônio Líquido
            </span>
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <div
            className={`mt-2 tabular text-2xl font-black ${
              summary.netWorth >= 0 ? 'text-primary' : 'text-destructive'
            }`}
          >
            {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(summary.netWorth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ativos Brutos &minus; Passivos Totais
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Ativos Brutos
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(summary.totalAssets)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Caixa + Investimentos + Bens + Imóveis
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Passivos e Dívidas
            </span>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 tabular text-2xl font-bold text-destructive">
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              formatCurrency(summary.totalLiabilities)
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Financiamentos + Empréstimos + Cartões
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Endividamento
            </span>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div
            className={`mt-2 tabular text-2xl font-bold ${
              summary.debtRatio > 50
                ? 'text-destructive'
                : summary.debtRatio > 30
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isLoading ? <Skeleton className="h-8 w-20" /> : `${summary.debtRatio}%`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.debtRatio <= 30
              ? 'Nível de endividamento saudável'
              : 'Atenção ao peso dos passivos'}
          </p>
        </div>
      </div>

      {/* Gráficos de Composição do Balanço */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ativos */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <PieIcon className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-sm tabular">
              Composição dos Ativos ({formatCurrency(summary.totalAssets)})
            </h2>
          </div>
          {assetsPieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetsPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {assetsPieData.map((entry, index) => (
                      <Cell
                        key={`cell-asset-${index}`}
                        fill={entry.color || ASSET_COLORS[index % ASSET_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
              Nenhum ativo cadastrado ainda.
            </div>
          )}
        </div>

        {/* Passivos */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <PieIcon className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-sm tabular">
              Composição dos Passivos ({formatCurrency(summary.totalLiabilities)})
            </h2>
          </div>
          {liabilitiesPieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liabilitiesPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {liabilitiesPieData.map((entry, index) => (
                      <Cell
                        key={`cell-liab-${index}`}
                        fill={entry.color || LIABILITY_COLORS[index % LIABILITY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Parabéns! Você não possui passivos ou dívidas pendentes.
            </div>
          )}
        </div>
      </div>

      {/* Tabs de Detalhamento */}
      <div className="flex border-b border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'assets'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          Bens e Ativos Físicos ({assets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('liabilities')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'liabilities'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Passivos & Dívidas ({liabilities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'properties'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="h-4 w-4" />
          Imóveis ({properties.length})
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : activeTab === 'assets' ? (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Bens Físicos e Patrimoniais</h3>
              <p className="text-xs text-muted-foreground">
                Veículos, eletrônicos, equipamentos e itens convertidos a partir de metas.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenNewAsset} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Adicionar Bem
            </Button>
          </div>

          {assets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum bem patrimonial cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs font-medium text-left border-b">
                  <tr>
                    <th className="py-3 px-4">Nome do Bem</th>
                    <th className="py-3 px-4 hidden md:table-cell">Classificação</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">
                      Valor de Aquisição
                    </th>
                    <th className="py-3 px-4 text-right">Valor Atual Estimado</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Data Aquisição</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                            {getAssetIcon(a.type)}
                          </div>
                          <div>
                            <div className="font-semibold">{a.name}</div>
                            {a.goal_id && (
                              <span className="text-[10px] text-primary font-medium">
                                Originado de Meta
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs capitalize hidden md:table-cell">
                        {a.type}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground tabular hidden sm:table-cell">
                        {formatCurrency(a.acquisition_value)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground tabular">
                        {formatCurrency(a.current_value)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs tabular hidden lg:table-cell">
                        {new Date(a.acquisition_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {confirmDeleteAssetId === a.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => setConfirmDeleteAssetId(null)}
                            >
                              Não
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleConfirmDeleteAsset(a.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditAsset(a)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteAssetId(a.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'liabilities' ? (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Passivos e Obrigações Financeiras</h3>
              <p className="text-xs text-muted-foreground">
                Empréstimos, dívidas e financiamentos que reduzem o seu patrimônio líquido.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenNewLiab} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Adicionar Passivo
            </Button>
          </div>

          {liabilities.length === 0 ? (
            <div className="p-8 text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Nenhuma dívida ou obrigação cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs font-medium text-left border-b">
                  <tr>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 hidden md:table-cell">Tipo</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">
                      Total Contratado
                    </th>
                    <th className="py-3 px-4 text-right">Saldo Devedor Restante</th>
                    <th className="py-3 px-4 text-right hidden lg:table-cell">Parcela Mensal</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liabilities.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold">{l.name}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs capitalize hidden md:table-cell">
                        {l.type}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground tabular hidden sm:table-cell">
                        {formatCurrency(l.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-destructive tabular">
                        {formatCurrency(l.current_balance)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs tabular hidden lg:table-cell">
                        {l.monthly_payment ? formatCurrency(l.monthly_payment) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {confirmDeleteLiabId === l.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => setConfirmDeleteLiabId(null)}
                            >
                              Não
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleConfirmDeleteLiab(l.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditLiab(l)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteLiabId(l.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Patrimônio Imobiliário Integrado</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Os imóveis e financiamentos cadastrados no módulo Imóveis alimentam automaticamente o Balanço Patrimonial.
              </p>
            </div>
            <Link to="/imoveis">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                Ir para Módulo Imóveis <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {properties.map((p) => (
              <div key={p.id} className="p-4 rounded-xl border bg-muted/20 space-y-2 tabular">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      {p.builder || 'Construtora'} &bull; {p.unit || 'Unidade'}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {p.amortization_system.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">Valor de Mercado/Contrato:</span>
                  <span className="font-bold">
                    {formatCurrency(p.current_market_value || p.contract_value)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Financiamento Contratado:</span>
                  <span className="text-destructive font-medium">
                    {formatCurrency(p.financed_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      <AssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        assetToEdit={editingAsset}
      />

      <LiabilityDialog
        open={liabDialogOpen}
        onOpenChange={setLiabDialogOpen}
        liabilityToEdit={editingLiab}
      />
    </div>
  )
}
