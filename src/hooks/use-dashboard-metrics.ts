import { useQuery } from '@tanstack/react-query'
import { fetchDashboardMetrics, type DashboardMetrics } from '@/services/dashboard'
import { useAuth } from '@/hooks/use-auth'

export function useDashboardMetrics() {
  const { user } = useAuth()

  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: fetchDashboardMetrics,
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
  })
}

