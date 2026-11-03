import { useState, useMemo } from 'react'
import { useVaults, type VaultItem } from '@/hooks/use-vaults'
import { useTransactions } from '@/hooks/use-transactions'
import { VaultDialog } from '@/components/vault-dialog'
import { VaultTransferDialog } from '@/components/vault-transfer-dialog'
import { EmptyState } from '@/components/empty-state'
import { VAULT_PURPOSES } from '@/lib/validations/vault'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Vault,
  Plus,
  ShieldCheck,
  TrendingUp,
  Target,
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Archive,
  Sparkles,
  ArrowRightLeft,
  Lock,
} from 'lucide-react'

export default function CofresPage() {
  const {
    activeVaults,
    isLoading,
    totalBalance,
    totalTarget,
    overallProgress,
    archiveVault,
  } = useVaults()

  const { transactions } = useTransactions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vaultToEdit, setVaultToEdit] = useState<VaultItem | null>(null)

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTargetVault, setTransferTargetVault] = useState<VaultItem | null>(null)
  const [transferMode, setTransferMode] = useState<'deposit' | 'withdraw'>('deposit')

  const [selectedPurposeFilter, setSelectedPurposeFilter] = useState<string>('all')

  // Calcula estimativa de custo fixo mensal para a recomendação de Reserva de Emergência
  const recommendedEmergencyFund = useMemo(() => {
    let monthlyFixed = 0
    transactions.forEach((tx) => {
      if (tx.kind === 'expense' && tx.expense_classification === 'fixed') {
        monthlyFixed += Number(tx.amount)
      }
    })
    // Se houver transações fixas cadastradas, recomenda 6 meses; caso contrário, baseline prudente de R$ 15.000
    const base = monthlyFixed > 0 ? monthlyFixed * 6 : 18000
    return Math.round(base)
  }, [transactions])

  const filteredVaults = useMemo(() => {
    if (selectedPurposeFilter === 'all') return activeVaults
    return activeVaults.filter((v) => v.purpose === selectedPurposeFilter)
  }, [activeVaults, selectedPurposeFilter])

  function handleCreate() {
    setVaultToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(vault: VaultItem) {
    setVaultToEdit(vault)
    setDialogOpen(true)
  }

  function handleQuickDeposit(vault: VaultItem) {
    setTransferTargetVault(vault)
    setTransferMode('deposit')
    setTransferOpen(true)
  }

  function handleQuickWithdraw(vault: VaultItem) {
    setTransferTargetVault(vault)
    setTransferMode('withdraw')
    setTransferOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Vault className="size-7 text-primary" />
            Reservas & Cofres
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cofres blindados, reserva de emergência e alocações carimbadas separadas da conta corrente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeVaults.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTransferTargetVault(activeVaults[0] || null)
                setTransferMode('deposit')
                setTransferOpen(true)
              }}
              className="text-xs font-semibold gap-1.5"
            >
              <ArrowRightLeft className="size-3.5 text-primary" />
              Guardar / Resgatar
            </Button>
          )}

          <Button onClick={handleCreate} size="sm" className="text-xs font-semibold gap-1.5">
            <Plus className="size-4" />
            Novo Cofre
          </Button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guardado */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Total nos Cofres</span>
            <Lock className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalBalance)}
          </div>
          <p className="text-[11px] text-muted-foreground">Liquidez protegida em reservas</p>
        </div>

        {/* Metas Consolidadas */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Metas Estabelecidas</span>
            <Target className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalTarget)}
          </div>
          <p className="text-[11px] text-muted-foreground">Soma de todos os objetivos</p>
        </div>

        {/* Progresso Geral */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Cobertura Geral</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="flex items-center justify-between">
            <span className="tabular text-2xl font-bold tracking-tight text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${overallProgress}%`}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Quantidade de Cofres */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Cofres Ativos</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              `${activeVaults.length} ${activeVaults.length === 1 ? 'cofre' : 'cofres'}`
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Reservas independentes</p>
        </div>
      </div>

      {/* Banner de Recomendação Inteligente de Reserva de Emergência */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-foreground">
                Recomendação de Blindagem Patrimonial
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Especialistas financeiros recomendam manter entre <strong>6 e 12 meses</strong> de gastos fixos em um cofre com liquidez diária. Sua meta recomendada para 6 meses é de{' '}
                <strong className="text-foreground">{formatBRL(recommendedEmergencyFund)}</strong>.
              </p>
            </div>
          </div>

          {!activeVaults.some((v) => v.purpose === 'emergency') && (
            <Button
              size="sm"
              onClick={handleCreate}
              className="text-xs shrink-0 font-semibold"
            >
              + Criar Reserva de Emergência
            </Button>
          )}
        </div>
      </div>

      {/* Filtros por Finalidade */}
      {activeVaults.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedPurposeFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedPurposeFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Todos ({activeVaults.length})
          </button>
          {VAULT_PURPOSES.map((p) => {
            const count = activeVaults.filter((v) => v.purpose === p.value).length
            if (count === 0) return null
            const isActive = selectedPurposeFilter === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setSelectedPurposeFilter(p.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {p.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Grid de Cofres */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : activeVaults.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed bg-card/40">
          <EmptyState
            title="Nenhum cofre cadastrado"
            description="Crie seu primeiro cofre para guardar sua Reserva de Emergência ou separar dinheiro para objetivos específicos."
            icon={Vault}
          />
          <Button size="sm" onClick={handleCreate} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            Criar Primeiro Cofre
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVaults.map((vault) => {
            const purposeMeta =
              VAULT_PURPOSES.find((p) => p.value === vault.purpose) || VAULT_PURPOSES[4]

            return (
              <div
                key={vault.id}
                className="group relative rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Faixa decorativa superior com cor personalizada */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
                  style={{ backgroundColor: vault.color }}
                />

                <div className="space-y-3">
                  {/* Topo do Card: Nome, Instituição e Menu */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground truncate">
                          {vault.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                        >
                          {purposeMeta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {vault.institution || 'Reserva Blindada'}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(vault)}>
                          <Edit2 className="size-4 mr-2" />
                          Editar Cofre
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => archiveVault({ id: vault.id, is_archived: true })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="size-4 mr-2" />
                          Arquivar Cofre
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Saldo Atual */}
                  <div className="space-y-1 py-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Saldo Acumulado
                    </span>
                    <div className="tabular text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatBRL(vault.current_balance)}
                    </div>
                  </div>

                  {/* Barra de Progresso da Meta */}
                  {vault.target_amount > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs tabular">
                        <span className="text-muted-foreground font-medium">
                          Meta: <strong>{formatBRL(vault.target_amount)}</strong>
                        </span>
                        <span className="font-bold text-primary">
                          {vault.progress_percent}%
                        </span>
                      </div>
                      <Progress value={vault.progress_percent} className="h-2" />
                      {vault.remaining_amount > 0 ? (
                        <p className="text-[11px] text-muted-foreground tabular">
                          Faltam {formatBRL(vault.remaining_amount)} para atingir a meta
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Meta 100% atingida! Parabéns!
                        </p>
                      )}
                    </div>
                  )}

                  {vault.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                      &ldquo;{vault.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Ações Rápidas: Guardar e Resgatar */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickDeposit(vault)}
                    className="text-xs h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1"
                  >
                    <ArrowDownLeft className="size-3.5" />
                    Guardar
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickWithdraw(vault)}
                    disabled={vault.current_balance <= 0}
                    className="text-xs h-8 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-semibold gap-1"
                  >
                    <ArrowUpRight className="size-3.5" />
                    Resgatar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Histórico Recente de Movimentações nos Cofres */}
      {activeVaults.some((v) => v.recentTransactions.length > 0) && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-base">Últimas Movimentações nos Cofres</h3>
                <p className="text-xs text-muted-foreground">
                  Aportes e resgates registrados recentemente
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {activeVaults
              .flatMap((v) =>
                v.recentTransactions.map((tx) => ({
                  ...tx,
                  vaultName: v.name,
                  isDeposit: tx.to_account_id === v.id,
                }))
              )
              .sort((a, b) => b.due_date.localeCompare(a.due_date))
              .slice(0, 8)
              .map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        tx.isDeposit
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {tx.isDeposit ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.due_date)} &middot; {tx.vaultName}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`tabular text-sm font-bold ${
                      tx.isDeposit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {tx.isDeposit ? '+ ' : '- '}
                    {formatBRL(tx.amount)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modais */}
      <VaultDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vaultToEdit={vaultToEdit}
      />

      <VaultTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        initialVault={transferTargetVault}
        initialMode={transferMode}
      />
    </div>
  )
}
