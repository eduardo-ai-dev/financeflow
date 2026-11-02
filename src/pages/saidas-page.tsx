import { EmptyState } from '@/components/empty-state'
import { ArrowUpRight } from 'lucide-react'

export default function SaidasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saídas & Despesas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Controle de gastos fixos, variáveis, eventuais e contas a pagar.
        </p>
      </div>

      <EmptyState
        title="Nenhuma despesa registrada"
        description="Lance e categorize seus pagamentos para identificar para onde seu dinheiro está indo."
        icon={ArrowUpRight}
        phase={2}
      />
    </div>
  )
}

