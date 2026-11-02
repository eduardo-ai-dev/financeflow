import { EmptyState } from '@/components/empty-state'
import { Home } from 'lucide-react'

export default function ImoveisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão Imobiliária</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aquisição, parcelas de entrada, evolução de obra (INCC), financiamento SAC/Price e amortizações.
        </p>
      </div>

      <EmptyState
        title="Nenhum imóvel cadastrado"
        description="Separe o que é amortização de principal do custo com juros e calcule o Custo Efetivo Total do seu imóvel."
        icon={Home}
        phase={4}
      />
    </div>
  )
}

