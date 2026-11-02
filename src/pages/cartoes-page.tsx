import { useState, useMemo } from 'react'
import { useCards, type CreditCardWithLimit } from '@/hooks/use-cards'
import { useInvoices, type InvoiceWithTotals } from '@/hooks/use-invoices'
import { useAccounts } from '@/hooks/use-accounts'
import { CardDialog } from '@/components/card-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CreditCard as CardIcon,
  Plus,
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Calendar,
  AlertCircle,
  Receipt,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function CartoesPage() {
  const { cards, isLoading: isLoadingCards, archiveCard, unarchiveCard } = useCards()
  const { invoices, isLoading: isLoadingInvoices, payInvoice, isPaying } = useInvoices()
  const { accounts } = useAccounts()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [cardToEdit, setCardToEdit] = useState<CreditCardWithLimit | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  // Estado para pagar fatura
  const [payInvoiceModalOpen, setPayInvoiceModalOpen] = useState(false)
  const [invoiceToPay, setInvoiceToPay] = useState<InvoiceWithTotals | null>(null)
  const [selectedDebitAccountId, setSelectedDebitAccountId] = useState<string>('')
  const [payError, setPayError] = useState<string | null>(null)

  const activeCards = useMemo(() => cards.filter((c) => !c.is_archived), [cards])
  const archivedCards = useMemo(() => cards.filter((c) => c.is_archived), [cards])
  const displayedCards = showArchived ? archivedCards : activeCards

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.is_archived), [accounts])

  // KPIs
  const totalLimit = useMemo(
    () => activeCards.reduce((acc, c) => acc + Number(c.limit_amount), 0),
    [activeCards]
  )

  const totalUsedLimit = useMemo(
    () => activeCards.reduce((acc, c) => acc + Number(c.used_amount), 0),
    [activeCards]
  )

  const totalAvailableLimit = Math.max(0, totalLimit - totalUsedLimit)

  function handleCreate() {
    setCardToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(c: CreditCardWithLimit) {
    setCardToEdit(c)
    setDialogOpen(true)
  }

  function handleOpenPayInvoice(inv: InvoiceWithTotals) {
    setInvoiceToPay(inv)
    setSelectedDebitAccountId(
      inv.card?.default_account_id || (activeAccounts[0]?.id ?? '')
    )
    setPayError(null)
    setPayInvoiceModalOpen(true)
  }

  async function handleConfirmPayment() {
    if (!invoiceToPay || !selectedDebitAccountId) return
    setPayError(null)
    try {
      await payInvoice({
        invoiceId: invoiceToPay.id,
        accountId: selectedDebitAccountId,
      })
      setPayInvoiceModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao quitar fatura'
      setPayError(msg)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cartões de Crédito
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie limites, faturas abertas e futuras com conciliação contábil sem duplicidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {archivedCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs"
            >
              <Archive className="size-3.5 mr-1.5" />
              {showArchived ? 'Ver Cartões Ativos' : `Arquivados (${archivedCards.length})`}
            </Button>
          )}

          <Button onClick={handleCreate} size="sm" className="text-xs">
            <Plus className="size-4 mr-1.5" />
            Novo Cartão
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Limite Disponível */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Limite Total Disponível</span>
            <CardIcon className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoadingCards ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalAvailableLimit)}
          </div>
          <p className="text-[11px] text-muted-foreground">Crédito livre para novas compras</p>
        </div>

        {/* Limite Utilizado */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Limite Utilizado</span>
            <Receipt className="size-4 text-rose-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {isLoadingCards ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalUsedLimit)}
          </div>
          <p className="text-[11px] text-muted-foreground">Compras, faturas e gastos informados</p>
        </div>

        {/* Total de Limite Cadastrado */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Limite Total Outorgado</span>
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground">
            {isLoadingCards ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalLimit)}
          </div>
          <p className="text-[11px] text-muted-foreground">{activeCards.length} cartões ativos</p>
        </div>
      </div>

      {/* Grid de Cartões Físicos / Digitais */}
      {isLoadingCards ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : displayedCards.length === 0 ? (
        <EmptyState
          title={showArchived ? 'Nenhum cartão arquivado' : 'Nenhum cartão cadastrado'}
          description={
            showArchived
              ? 'Você não possui nenhum cartão de crédito arquivado.'
              : 'Cadastre seus cartões de crédito para controlar o limite utilizado e o pagamento das faturas sem duplicar despesas.'
          }
          icon={CardIcon}
          phase={3}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCards.map((card) => {
            const usedPercent =
              card.limit_amount > 0
                ? Math.min(100, Math.round((card.used_amount / Number(card.limit_amount)) * 100))
                : 0

            return (
              <div
                key={card.id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-xs transition-all hover:shadow-md"
              >
                {/* Visual Estilo Cartão */}
                <div
                  className="rounded-xl p-5 text-white shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden"
                  style={{ backgroundColor: card.color || '#4f46e5' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider opacity-80 font-medium">
                        {card.institution || 'Cartão de Crédito'}
                      </span>
                      <h3 className="font-bold text-lg tracking-tight mt-0.5">{card.name}</h3>
                    </div>
                    {/* Bandeira */}
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                      {card.brand}
                    </span>
                  </div>

                  {/* Limite Disponível */}
                  <div className="mt-4">
                    <span className="text-[11px] opacity-80 uppercase font-semibold">
                      Limite Disponível
                    </span>
                    <div className="tabular text-xl sm:text-2xl font-extrabold tracking-tight">
                      {formatBRL(card.available_limit)}
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso de Limite */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uso do limite:</span>
                    <span className="font-semibold text-foreground">{usedPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        usedPercent >= 90
                          ? 'bg-rose-500'
                          : usedPercent >= 70
                          ? 'bg-amber-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Gasto: {formatBRL(card.used_amount)}</span>
                    <span>Total: {formatBRL(card.limit_amount)}</span>
                  </div>
                </div>

                {/* Rodapé: Datas e Ações */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Dia de fechamento da fatura">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span>Fecha dia {card.closing_day}</span>
                    </div>
                    <span>&middot;</span>
                    <span>Vence dia {card.due_day}</span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(card)}>
                        <Edit2 className="size-4 mr-2" />
                        Editar Cartão
                      </DropdownMenuItem>
                      {card.is_archived ? (
                        <DropdownMenuItem onClick={() => unarchiveCard(card.id)}>
                          <ArchiveRestore className="size-4 mr-2" />
                          Desarquivar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => archiveCard(card.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="size-4 mr-2" />
                          Arquivar Cartão
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Faturas em Aberto e Recentes */}
      {!isLoadingInvoices && invoices.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Faturas do Cartão
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faturas abertas e histórico de faturas pagas. O pagamento debita sua conta bancária sem duplicar despesas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Cartão</th>
                  <th className="py-2.5 px-4">Referência</th>
                  <th className="py-2.5 px-4">Vencimento</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Total da Fatura</th>
                  <th className="py-2.5 px-4 text-center w-28">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {inv.card?.name || 'Cartão'}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {String(inv.month).padStart(2, '0')}/{inv.year}
                    </td>
                    <td className="py-3 px-4 tabular text-xs text-muted-foreground">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="py-3 px-4">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-3" /> Paga
                        </span>
                      ) : inv.status === 'closed' ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          Fechada
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          Aberta
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular font-bold text-foreground">
                      {formatBRL(inv.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status !== 'paid' && inv.total_amount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPayInvoice(inv)}
                          className="h-7 text-xs font-semibold"
                        >
                          Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog do Cartão */}
      <CardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cardToEdit={cardToEdit}
      />

      {/* Modal de Pagamento de Fatura */}
      <Dialog open={payInvoiceModalOpen} onOpenChange={setPayInvoiceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar Fatura</DialogTitle>
            <DialogDescription>
              Confirme a quitação da fatura do cartão {invoiceToPay?.card?.name}.
            </DialogDescription>
          </DialogHeader>

          {payError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Valor Total a Pagar
              </span>
              <div className="tabular text-3xl font-extrabold text-foreground">
                {formatBRL(invoiceToPay?.total_amount ?? 0)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Referência: {invoiceToPay?.month}/{invoiceToPay?.year} &middot; Vencimento:{' '}
                {formatDate(invoiceToPay?.due_date)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-debit-account">Conta Bancária de Débito *</Label>
              <select
                id="pay-debit-account"
                value={selectedDebitAccountId}
                onChange={(e) => setSelectedDebitAccountId(e.target.value)}
                disabled={isPaying}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  Selecione a conta
                </option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Regra Contábil:</strong> O pagamento debita o saldo da conta bancária
              selecionada sem gerar nova despesa nas categorias de consumo, pois os lançamentos
              já foram reconhecidos no momento da compra.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPaying}
              onClick={() => setPayInvoiceModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPaying || !selectedDebitAccountId}
              onClick={handleConfirmPayment}
            >
              {isPaying && <Loader2 className="size-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export { CartoesPage }
