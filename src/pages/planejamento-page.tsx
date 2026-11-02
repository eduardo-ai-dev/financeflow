import { EmptyState } from '@/components/empty-state'
import { Sparkles } from 'lucide-react'

export default function PlanejamentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planejamento Futuro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Simulador de cenários (Conservador, Realista e Otimista) e projeções de fluxo de caixa em sandbox.
        </p>
      </div>

      <EmptyState
        title="Simulador de Cenários"
        description="Projete sua vida financeira para os próximos 3 meses, 1 ano ou 5 anos simulando eventos sem alterar seus dados reais."
        icon={Sparkles}
        phase={7}
      />
    </div>
  )
}

