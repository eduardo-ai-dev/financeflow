import { EmptyState } from '@/components/empty-state'
import { ArrowDownLeft } from 'lucide-react'

export default function EntradasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entradas & Receitas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Controle de salários, rendimentos, comissões e valores a receber.
        </p>
      </div>

      <EmptyState
        title="Nenhuma receita registrada"
        description="Registre seus rendimentos regulares e esporádicos para acompanhar o crescimento da sua renda."
        icon={ArrowDownLeft}
        phase={2}
      />
    </div>
  )
}

