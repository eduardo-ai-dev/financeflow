import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlerts, type FinancialAlert } from '@/hooks/use-alerts'
import type { AlertCategory } from '@/lib/alerts'
import { formatBRL } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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

export function AlertsCenter() {
  const navigate = useNavigate()
  const {
    activeAlerts,
    criticalCount,
    dismissedCount,
    dismissAlert,
    restoreDismissedAlerts,
  } = useAlerts()

  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | AlertCategory>('all')

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return activeAlerts
    return activeAlerts.filter((a) => a.category === filter)
  }, [activeAlerts, filter])

  const countsByCategory = useMemo(() => {
    return {
      all: activeAlerts.length,
      bills: activeAlerts.filter((a) => a.category === 'bills').length,
      cards: activeAlerts.filter((a) => a.category === 'cards').length,
      goals: activeAlerts.filter((a) => a.category === 'goals').length,
    }
  }, [activeAlerts])

  function handleNavigate(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative text-muted-foreground hover:text-foreground"
        title="Central de Alertas"
        aria-label={`Central de Alertas (${activeAlerts.length} ativos)`}
      >
        <Bell className="size-4.5" />
        {activeAlerts.length > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex min-w-4 h-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs ${
              criticalCount > 0 ? 'bg-rose-500' : 'bg-primary'
            }`}
          >
            {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-4 border-b space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 pr-6">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Bell className="size-5 text-primary" />
                  Central de Alertas
                </DialogTitle>
                {dismissedCount > 0 && (
                  <button
                    type="button"
                    onClick={restoreDismissedAlerts}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    Reexibir ocultos ({dismissedCount})
                  </button>
                )}
              </div>
              <DialogDescription>
                Acompanhe vencimentos próximos, faturas, limites de cartões e evolução das suas metas.
              </DialogDescription>
            </DialogHeader>

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
                const count = countsByCategory[tab.key]
                const isActive = filter === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] tabular ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista de Alertas */}
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Tudo em dia por aqui!
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Nenhum alerta pendente para o filtro selecionado. Suas contas, cartões e metas estão sob controle.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity]
                const Icon = getAlertIcon(alert)

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-3.5 transition-all ${style.border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
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
                          <div className="flex items-center gap-3 pt-1">
                            {alert.amount !== undefined && (
                              <span className="text-xs font-bold tabular text-foreground">
                                {formatBRL(alert.amount)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleNavigate(alert.actionPath)}
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
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
                        title="Ocultar este alerta"
                        aria-label="Ocultar este alerta"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

