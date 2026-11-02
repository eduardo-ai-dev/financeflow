import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  description?: string
  badge?: string
  badgeVariant?: 'default' | 'success' | 'destructive' | 'warning' | 'info'
  valueColor?: string
  iconColor?: string
  isLoading?: boolean
}

const badgeStyles = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/10 text-success border-success/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  badge,
  badgeVariant = 'default',
  valueColor = 'text-foreground',
  iconColor = 'bg-primary/10 text-primary',
  isLoading = false,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="size-9 rounded-xl" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconColor} transition-transform group-hover:scale-105`}>
          <Icon className="size-4.5" />
        </div>
      </div>

      {/* Valor e Informações */}
      <div className="mt-3">
        <div className={`tabular text-2xl font-bold tracking-tight sm:text-3xl ${valueColor}`}>
          {value}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {badge && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeStyles[badgeVariant]}`}>
              {badge}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">
              {description}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

