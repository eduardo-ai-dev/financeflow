import { EmptyState } from '@/components/empty-state'
import { CalendarClock } from 'lucide-react'

export default function ParcelamentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Central de Parcelamentos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visão unificada de compromissos no cartão, carnês e financiamentos parcelados.
        </p>
      </div>

      <EmptyState
        title="Nenhum parcelamento ativo"
        description="Acompanhe o progresso das parcelas pagas vs. restantes e a data de encerramento de cada compromisso."
        icon={CalendarClock}
        phase={3}
      />
    </div>
  )
}

