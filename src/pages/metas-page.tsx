import { EmptyState } from '@/components/empty-state'
import { Target } from 'lucide-react'

export default function MetasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Metas & Lista de Compras</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Wishlist, reservas com destinação carimbada e fluxo de conversão em ativo patrimonial.
        </p>
      </div>

      <EmptyState
        title="Nenhuma meta criada"
        description="Defina suas metas de curto, médio e longo prazo, acompanhe o valor reservado e converta itens comprados diretamente em patrimônio."
        icon={Target}
        phase={5}
      />
    </div>
  )
}

