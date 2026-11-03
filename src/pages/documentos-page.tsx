import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { createReceiptSignedUrl } from '@/services/attachments'
import { formatFileSize } from '@/lib/validations/attachment'
import { formatDate } from '@/lib/date'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FolderLock,
  FileText,
  Paperclip,
  ExternalLink,
  Search,
  Loader2,
  ShieldCheck,
  FileCheck,
} from 'lucide-react'

export default function DocumentosPage() {
  const { transactions, isLoading } = useTransactions()
  const [search, setSearch] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)

  // Documentos anexados a transações
  const attachedTransactions = useMemo(() => {
    return transactions.filter((t) => t.attachment)
  }, [transactions])

  const filtered = useMemo(() => {
    return attachedTransactions.filter((t) => {
      if (!search) return true
      const term = search.toLowerCase()
      return (
        t.description.toLowerCase().includes(term) ||
        t.attachment?.name.toLowerCase().includes(term)
      )
    })
  }, [attachedTransactions, search])

  async function handleOpen(path: string, txId: string) {
    setOpeningId(txId)
    try {
      const url = await createReceiptSignedUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Silencioso
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderLock className="size-7 text-primary" />
            Cofre de Documentos & Comprovantes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Armazenamento seguro e criptografado para comprovantes de pagamento, notas fiscais e contratos.
          </p>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Comprovantes Armazenados</span>
            <FileCheck className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : attachedTransactions.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Arquivos vinculados a lançamentos</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Segurança e Acesso</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            Protegido
          </div>
          <p className="text-[11px] text-muted-foreground">Links de acesso temporários e criptografados</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Formatos Aceitos</span>
            <Paperclip className="size-4 text-primary" />
          </div>
          <div className="text-sm font-bold text-foreground mt-1">
            PDF, PNG, JPG, WEBP
          </div>
          <p className="text-[11px] text-muted-foreground">Até 5 MB por documento</p>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
          <div>
            <h2 className="font-bold text-base text-foreground">Comprovantes & Notas Fiscais</h2>
            <p className="text-xs text-muted-foreground">
              Documentos vinculados às suas movimentações financeiras
            </p>
          </div>

          <div className="relative sm:w-72">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar documento ou lançamento..."
              className="flex h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum comprovante encontrado"
            description="Ao criar ou editar uma despesa ou receita, você pode anexar boletos pagos, recibos ou notas fiscais."
            icon={FolderLock}
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((tx) => {
              const att = tx.attachment!
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {att.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Lançamento: <strong>{tx.description}</strong> &middot;{' '}
                        {formatDate(tx.due_date)} &middot; {formatFileSize(att.size)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={openingId === tx.id}
                    onClick={() => handleOpen(att.path, tx.id)}
                    className="h-8 text-xs gap-1.5 shrink-0"
                  >
                    {openingId === tx.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="size-3.5" />
                    )}
                    Visualizar
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
