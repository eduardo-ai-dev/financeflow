import { EmptyState } from '@/components/empty-state'
import { TrendingUp } from 'lucide-react'

export default function InvestimentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investimentos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Carteira de Renda Fixa, Renda Variável, Fundos, Previdência e Proventos.
        </p>
      </div>

      <EmptyState
        title="Nenhum ativo na carteira"
        description="Acompanhe aportes, rentabilidade e dividendos sem confundir investimentos com despesas de consumo."
        icon={TrendingUp}
        phase={6}
      />
    </div>
  )
}

