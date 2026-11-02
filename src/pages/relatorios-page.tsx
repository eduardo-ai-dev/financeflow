import { EmptyState } from '@/components/empty-state'
import { FileSpreadsheet } from 'lucide-react'

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios & Indicadores</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visão analítica, taxas de poupança, distribuição de despesas e exportações em CSV, Excel e PDF.
        </p>
      </div>

      <EmptyState
        title="Central de Relatórios"
        description="Gere demonstrativos detalhados de despesas por categoria, rentabilidade histórica e exportação para contabilidade."
        icon={FileSpreadsheet}
        phase={8}
      />
    </div>
  )
}

