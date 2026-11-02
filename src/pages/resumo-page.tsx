import { EmptyState } from '@/components/empty-state'
import { BarChart3 } from 'lucide-react'

export default function ResumoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumo Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Análise detalhada do fluxo de caixa e comparativo de receitas e despesas.
        </p>
      </div>

      <EmptyState
        title="Fluxo de Caixa em Construção"
        description="Aqui você terá o comparativo visual entre entradas e saídas, cálculo da capacidade de poupança e evolução do caixa."
        icon={BarChart3}
        phase={2}
      />
    </div>
  )
}

