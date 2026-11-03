import { useState, useMemo } from 'react'
import { useLiabilities } from '@/hooks/use-liabilities'
import { usePatrimony } from '@/hooks/use-patrimony'
import { useProperties } from '@/hooks/use-properties'
import { LiabilityDialog } from '@/components/liability-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  BadgePercent,
  Plus,
  Building,
  CreditCard,
  AlertTriangle,
  Calendar,
  Percent,
  Trash2,
  Edit2,
  MoreVertical,
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [liabilityToEdit, setLiabilityToEdit] = useState<Liability | null>(null)

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

  const totalLiabilities =
    totalMortgageDebt + totalOtherDebt + (summary.liabilitiesBreakdown?.creditCard || 0)

  function handleCreate() {
    setLiabilityToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(l: Liability) {
    setLiabilityToEdit(l)
    setDialogOpen(true)
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
            Mapeamento de passivos onerosos, empréstimos, financiamentos e custo do endividamento.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs font-semibold gap-1.5">
          <Plus className="size-4" />
          Novo Passivo / Dívida
        </Button>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Passivo Total</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalLiabilities)}
          </div>
          <p className="text-[11px] text-muted-foreground">Financiamentos + Empréstimos + Cartões</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Saldo Imobiliário</span>
            <Building className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalMortgageDebt)}
          </div>
          <p className="text-[11px] text-muted-foreground">{financedProperties.length} imóveis financiados</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Empréstimos / Outros</span>
            <Percent className="size-4 text-amber-500" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : formatBRL(totalOtherDebt)}
          </div>
          <p className="text-[11px] text-muted-foreground">{liabilities.length} contratos ativos</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Uso de Cartão</span>
            <CreditCard className="size-4 text-indigo-500" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : (
              formatBRL(summary.liabilitiesBreakdown?.creditCard || 0)
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Faturas em aberto no ciclo</p>
        </div>
      </div>

      {/* Financiamentos Imobiliários */}
      {financedProperties.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <Building className="size-5 text-primary" />
              <div>
                <h2 className="font-bold text-base text-foreground">Financiamentos Imobiliários Ativos</h2>
                <p className="text-xs text-muted-foreground">
                  Saldos devedores gerenciados no módulo de Imóveis
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {financedProperties.map((p) => (
              <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {p.amortization_system.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.bank || 'Instituição'} &middot; Taxa:{' '}
                    <strong>{p.annual_interest_rate}% a.a.</strong> &middot;{' '}
                    {(p.total_term_months || 0) - (p.paid_months || 0)} meses restantes
                  </p>
                </div>

                <div className="text-right tabular">
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {formatBRL(p.financed_amount)}
                  </span>
                  <p className="text-[11px] text-muted-foreground">Saldo Devedor Atual</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Empréstimos e Passivos */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <h2 className="font-bold text-base text-foreground">Empréstimos, Dívidas e Outros Passivos</h2>
            <p className="text-xs text-muted-foreground">
              Passivos contratados com cronograma de quitação
            </p>
          </div>
          <Button onClick={handleCreate} size="sm" variant="outline" className="text-xs gap-1">
            <Plus className="size-3.5" /> Adicionar
          </Button>
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
            {liabilities.map((l) => (
              <div key={l.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{l.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {l.type === 'loan' ? 'Empréstimo' : l.type === 'financing' ? 'Financiamento' : 'Dívida'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {l.interest_rate_monthly && (
                      <span>Taxa: {l.interest_rate_monthly}% a.m.</span>
                    )}
                    {l.remaining_installments && (
                      <span>&middot; {l.remaining_installments} parcelas restantes</span>
                    )}
                    {l.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> Vencimento: {formatDate(l.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right tabular">
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatBRL(l.current_balance)}
                    </span>
                    {l.monthly_payment && (
                      <p className="text-[11px] text-muted-foreground">
                        Parcela: {formatBRL(l.monthly_payment)}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(l)}>
                        <Edit2 className="size-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteLiability(l.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LiabilityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        liabilityToEdit={liabilityToEdit}
      />
    </div>
  )
}
