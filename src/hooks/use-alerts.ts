import { useState, useMemo, useCallback } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { useInvoices } from '@/hooks/use-invoices'
import { useGoals } from '@/hooks/use-goals'
import { getTodayDateString } from '@/lib/date'
import { buildFinancialAlerts, type FinancialAlert } from '@/lib/alerts'

const DISMISSED_STORAGE_KEY = 'financeflow:dismissed-alerts:v1'

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item): item is string => typeof item === 'string'))
    }
  } catch {
    // Ignora falha de leitura local
  }
  return new Set()
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // Ignora falha de escrita local
  }
}

export function useAlerts() {
  const { transactions, isLoading: loadingTx } = useTransactions()
  const { cards, isLoading: loadingCards } = useCards()
  const { invoices, isLoading: loadingInvoices } = useInvoices()
  const { goals, isLoading: loadingGoals } = useGoals()

  const [todayStr] = useState(() => getTodayDateString())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedIds())

  const allAlerts = useMemo(
    () =>
      buildFinancialAlerts({
        todayStr,
        transactions,
        cards,
        invoices,
        goals,
      }),
    [todayStr, transactions, cards, invoices, goals]
  )

  const activeAlerts = useMemo(
    () => allAlerts.filter((a) => !dismissedIds.has(a.id)),
    [allAlerts, dismissedIds]
  )

  const criticalCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'critical').length,
    [activeAlerts]
  )

  const dismissAlert = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDismissedIds(next)
      return next
    })
  }, [])

  const restoreDismissedAlerts = useCallback(() => {
    const empty = new Set<string>()
    saveDismissedIds(empty)
    setDismissedIds(empty)
  }, [])

  return {
    allAlerts,
    activeAlerts,
    criticalCount,
    dismissedCount: allAlerts.length - activeAlerts.length,
    dismissAlert,
    restoreDismissedAlerts,
    isLoading: loadingTx || loadingCards || loadingInvoices || loadingGoals,
  }
}

export type { FinancialAlert }

