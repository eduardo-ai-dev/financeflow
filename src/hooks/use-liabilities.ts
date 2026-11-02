import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchLiabilities,
  createLiability as createLiabilityService,
  updateLiability as updateLiabilityService,
  deleteLiability as deleteLiabilityService,
} from '@/services/liabilities'
import { useAuth } from '@/hooks/use-auth'
import type { Liability } from '@/types/database'
import type { LiabilityFormData } from '@/lib/validations/liability'

export function useLiabilities() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: liabilities = [], isLoading, error } = useQuery({
    queryKey: ['liabilities', user?.id],
    queryFn: fetchLiabilities,
    enabled: !!user?.id,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['liabilities'] })
    queryClient.invalidateQueries({ queryKey: ['patrimony'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: LiabilityFormData) => createLiabilityService(data),
    onSuccess: () => invalidateAll(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LiabilityFormData> }) =>
      updateLiabilityService(id, data),
    onSuccess: () => invalidateAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLiabilityService(id),
    onSuccess: () => invalidateAll(),
  })

  return {
    liabilities,
    isLoading,
    error,
    createLiability: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLiability: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLiability: deleteMutation.mutateAsync,
  }
}

export type { Liability }
