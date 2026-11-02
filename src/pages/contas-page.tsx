import { EmptyState } from '@/components/empty-state'
import { Landmark } from 'lucide-react'

export default function ContasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contas Financeiras</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestão de bancos, carteiras digitais, espécie e cofres.
        </p>
      </div>

      <EmptyState
        title="Nenhuma conta cadastrada"
        description="Cadastre suas contas correntes, contas digitais, poupanças e carteiras de investimento para acompanhar seus saldos reais calculados."
        icon={Landmark}
        phase={2}
      />
    </div>
  )
}

