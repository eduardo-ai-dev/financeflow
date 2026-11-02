import { EmptyState } from '@/components/empty-state'
import { Scale } from 'lucide-react'

export default function PatrimonioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patrimônio Pessoal</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Balanço patrimonial completo: Total de Ativos (Bens) &minus; Total de Passivos (Dívidas).
        </p>
      </div>

      <EmptyState
        title="Balanço Patrimonial"
        description="Visualize a evolução real do seu Patrimônio Líquido com cálculo automático e separação clara entre liquidez e bens imobilizados."
        icon={Scale}
        phase={6}
      />
    </div>
  )
}

