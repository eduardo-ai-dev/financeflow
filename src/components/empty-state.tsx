import type { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
  phase?: number
}

export function EmptyState({ title, description, icon: Icon, phase }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-8 sm:p-12 text-center animate-in fade-in-50">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
        <Icon className="size-7" />
      </div>

      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {phase && phase > 1 && (
        <div className="mt-6 flex items-center gap-2 rounded-full border bg-muted/50 px-3.5 py-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          <span>Previsto para a <strong>Fase {phase}</strong> do roadmap</span>
        </div>
      )}
    </div>
  )
}

