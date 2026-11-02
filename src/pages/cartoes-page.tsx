import { EmptyState } from '@/components/empty-state'
import { CreditCard } from 'lucide-react'

export default function CartoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cartões de Crédito</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestão de limites, melhores dias de compra e faturas atuais e futuras.
        </p>
      </div>

      <EmptyState
        title="Nenhum cartão cadastrado"
        description="Acompanhe o comprometimento do seu limite e a conciliação de faturas sem duplicar despesas."
        icon={CreditCard}
        phase={3}
      />
    </div>
  )
}

