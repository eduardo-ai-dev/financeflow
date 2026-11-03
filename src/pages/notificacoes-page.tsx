import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlerts, type FinancialAlert } from '@/hooks/use-alerts'
import type { AlertCategory } from '@/lib/alerts'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  AlertTriangle,
  Clock,
  CreditCard,
  Target,
  CheckCircle2,
  ArrowRight,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

const SEVERITY_STYLES: Record<
  FinancialAlert['severity'],
  {
    border: string
    iconBg: string
    badgeClass: string
    badgeLabel: string
  }
> = {
  critical: {
    border: 'border-rose-500/30 bg-rose-500/[0.04]',
    iconBg: 'bg-rose-500/15 text-rose-500',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    badgeLabel: 'Urgente',
  },
  warning: {
    border: 'border-amber-500/30 bg-amber-500/[0.04]',
    iconBg: 'bg-amber-500/15 text-amber-500',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    badgeLabel: 'Atenção',
  },
  success: {
    border: 'border-emerald-500/30 bg-emerald-500/[0.04]',
    iconBg: 'bg-emerald-500/15 text-emerald-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    badgeLabel: 'Conquista',
  },
  info: {
    border: 'border-sky-500/25 bg-sky-500/[0.03]',
    iconBg: 'bg-sky-500/15 text-sky-500',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    badgeLabel: 'Lembrete',
  },
}

function getAlertIcon(alert: FinancialAlert) {
  if (alert.severity === 'critical') return AlertTriangle
  if (alert.severity === 'success') return Sparkles
  if (alert.category === 'cards') return CreditCard
  if (alert.category === 'goals') return Target
  return Clock
}

export default function NotificacoesPage() {
  const navigate = useNavigate()
  const {
    activeAlerts,
    dismissedCount,
    dismissAlert,
    restoreDismissedAlerts,
  } = useAlerts()

  const [filter, setFilter] = useState<'all' | AlertCategory>('all')

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return activeAlerts
    return activeAlerts.filter((a) => a.category === filter)
  }, [activeAlerts, filter])

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Bell className="size-7 text-primary" />
            Central de Notificações & Alertas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitore compromissos próximos, limites bancários, faturas e marcos das suas metas.
          </p>
        </div>

        {dismissedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={restoreDismissedAlerts}
            className="text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Reexibir Ocultos ({dismissedCount})
          </Button>
        )}
      </div>

      {/* Filtros por Categoria */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { key: 'all', label: 'Todos' },
            { key: 'bills', label: 'Vencimentos' },
            { key: 'cards', label: 'Cartões' },
            { key: 'goals', label: 'Metas' },
          ] as const
        ).map((tab) => {
          const isActive = filter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center space-y-3 rounded-2xl border bg-card">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Nenhuma notificação ativa no momento
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Todas as suas obrigações financeiras, limites de cartões e prazos de metas estão em dia.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity]
            const Icon = getAlertIcon(alert)

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-4 transition-all ${style.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          {alert.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 font-semibold ${style.badgeClass}`}
                        >
                          {style.badgeLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 pt-1.5">
                        {alert.amount !== undefined && (
                          <span className="text-xs font-bold tabular text-foreground">
                            {formatBRL(alert.amount)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(alert.actionPath)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {alert.actionLabel}
                          <ArrowRight className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Dispensar notificação"
                    aria-label="Dispensar notificação"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

