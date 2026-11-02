import { EmptyState } from '@/components/empty-state'
import { FolderKanban } from 'lucide-react'

export default function ProjetosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projetos Financeiros</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Planejamento isolado de grandes objetivos: reforma, casamento, viagens ou troca de veículo.
        </p>
      </div>

      <EmptyState
        title="Nenhum projeto em andamento"
        description="Crie orçamentos específicos e vincule transações para acompanhar despesas sem misturar com o caixa diário."
        icon={FolderKanban}
        phase={4}
      />
    </div>
  )
}

