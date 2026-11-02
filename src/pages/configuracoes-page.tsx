import { EmptyState } from '@/components/empty-state'
import { Settings } from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerenciamento de categorias, campos personalizados, preferências de alertas e auditoria.
        </p>
      </div>

      <EmptyState
        title="Configurações & Preferências"
        description="Personalize suas categorias de receita e despesa, limites orçamentários e regras de alertas de vencimento."
        icon={Settings}
        phase={8}
      />
    </div>
  )
}

