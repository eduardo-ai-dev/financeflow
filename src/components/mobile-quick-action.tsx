import { useState } from 'react'
import { Plus, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionDialog } from '@/components/transaction-dialog'

export function MobileQuickAction() {
  const [isOpen, setIsOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [initialKind, setInitialKind] = useState<'income' | 'expense'>('expense')

  function handleOpenDialog(kind: 'income' | 'expense') {
    setInitialKind(kind)
    setDialogOpen(true)
    setIsOpen(false)
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 sm:hidden flex flex-col items-end gap-2.5">
        {/* Sub-ações flutuantes quando aberto */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => handleOpenDialog('income')}
              className="flex items-center gap-2 rounded-full bg-emerald-600 text-white px-3.5 py-2 shadow-lg hover:bg-emerald-700 text-xs font-semibold active:scale-95 transition-all"
            >
              <span>+ Receita</span>
              <div className="size-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowDownLeft className="size-3.5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDialog('expense')}
              className="flex items-center gap-2 rounded-full bg-rose-600 text-white px-3.5 py-2 shadow-lg hover:bg-rose-700 text-xs font-semibold active:scale-95 transition-all"
            >
              <span>- Despesa</span>
              <div className="size-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowUpRight className="size-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* Botão Principal Flutuante (FAB) */}
        <Button
          type="button"
          size="icon"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`size-13 rounded-full shadow-xl transition-transform active:scale-95 ${
            isOpen
              ? 'bg-muted-foreground text-background hover:bg-muted-foreground/90 rotate-90'
              : 'bg-primary text-primary-foreground hover:bg-primary/95 ring-4 ring-primary/20'
          }`}
          aria-label={isOpen ? 'Fechar atalhos rápidos' : 'Lançamento rápido'}
        >
          {isOpen ? <X className="size-5" /> : <Plus className="size-6" />}
        </Button>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialKind={initialKind}
      />
    </>
  )
}
