import { useState, useMemo } from 'react'
import { useAccounts } from '@/hooks/use-accounts'
import type { AccountWithBalance } from '@/services/accounts'
import { AccountDialog } from '@/components/account-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Landmark,
  Plus,
  Wallet,
  PiggyBank,
  Banknote,
  Briefcase,
  Vault,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Edit2,
  CheckCircle2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const accountTypeLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  digital: 'Conta Digital',
  savings: 'Poupança',
  wallet: 'Carteira Digital',
  cash: 'Dinheiro em Espécie',
  brokerage: 'Corretora / Investimentos',
  vault: 'Cofre / Reserva',
}

function getAccountIcon(type: string) {
  switch (type) {
    case 'cash':
      return Banknote
    case 'wallet':
      return Wallet
    case 'savings':
      return PiggyBank
    case 'brokerage':
      return Briefcase
    case 'vault':
      return Vault
    default:
      return Landmark
  }
}

export default function ContasPage() {
  const { accounts, isLoading, archiveAccount, unarchiveAccount } = useAccounts()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<AccountWithBalance | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.is_archived), [accounts])
  const archivedAccounts = useMemo(() => accounts.filter((a) => a.is_archived), [accounts])

  const displayedAccounts = showArchived ? archivedAccounts : activeAccounts

  const totalActiveBalance = useMemo(
    () => activeAccounts.reduce((acc, cur) => acc + Number(cur.current_balance || 0), 0),
    [activeAccounts]
  )

  function handleEdit(acc: AccountWithBalance) {
    setAccountToEdit(acc)
    setDialogOpen(true)
  }

  function handleCreate() {
    setAccountToEdit(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Contas Financeiras
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie seus bancos, carteiras digitais, dinheiro em espécie e cofres com saldos calculados em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {archivedAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs"
            >
              <Archive className="size-3.5 mr-1.5" />
              {showArchived ? 'Ver Contas Ativas' : `Arquivadas (${archivedAccounts.length})`}
            </Button>
          )}

          <Button onClick={handleCreate} size="sm" className="text-xs">
            <Plus className="size-4 mr-1.5" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Resumo do Saldo Total das Contas */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saldo Total em Contas Ativas
          </span>
          <div className="tabular text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-1">
            {isLoading ? <Skeleton className="h-10 w-48 mt-1" /> : formatBRL(totalActiveBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Calculado automaticamente a partir do saldo inicial e das movimentações efetivadas.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="size-4 text-primary" />
            <span>{activeAccounts.length} {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}</span>
          </div>
        </div>
      </div>

      {/* Lista de Contas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
      ) : displayedAccounts.length === 0 ? (
        <EmptyState
          title={showArchived ? 'Nenhuma conta arquivada' : 'Nenhuma conta cadastrada'}
          description={
            showArchived
              ? 'Você não possui contas arquivadas no momento.'
              : 'Cadastre suas contas correntes, contas digitais, poupanças ou carteiras para acompanhar seus saldos reais calculados.'
          }
          icon={Landmark}
          phase={2}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayedAccounts.map((account) => {
            const Icon = getAccountIcon(account.type)
            const isDifferentProjected =
              Math.abs(Number(account.projected_balance) - Number(account.current_balance)) > 0.01

            return (
              <div
                key={account.id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: account.color || '#10b981' }}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base tracking-tight text-foreground leading-tight">
                        {account.name}
                      </h3>
                      {account.institution && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {account.institution}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Menu de Ações */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label="Opções da conta"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(account)}>
                        <Edit2 className="size-4 mr-2" />
                        Editar Conta
                      </DropdownMenuItem>
                      {account.is_archived ? (
                        <DropdownMenuItem onClick={() => unarchiveAccount(account.id)}>
                          <ArchiveRestore className="size-4 mr-2" />
                          Desarquivar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => archiveAccount(account.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="size-4 mr-2" />
                          Arquivar Conta
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Saldos da Conta */}
                <div className="mt-5 pt-4 border-t space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Saldo Atual</span>
                    <span className="font-medium bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                      {accountTypeLabels[account.type] || account.type}
                    </span>
                  </div>
                  <div className="tabular text-2xl font-bold tracking-tight text-foreground">
                    {formatBRL(account.current_balance)}
                  </div>

                  {isDifferentProjected && (
                    <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between">
                      <span>Previsto no Mês:</span>
                      <span className="tabular font-medium text-foreground">
                        {formatBRL(account.projected_balance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog */}
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accountToEdit={accountToEdit}
      />
    </div>
  )
}
export { ContasPage }
