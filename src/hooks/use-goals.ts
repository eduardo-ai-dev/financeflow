import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGoals,
  createGoal as createGoalService,
  updateGoal as updateGoalService,
  deleteGoal as deleteGoalService,
  addGoalContribution as addContributionService,
  purchaseGoalAndConvertToAsset as convertGoalService,
  type GoalWithStats,
  type ConvertGoalParams,
} from '@/services/goals'
import type { GoalFormData } from '@/lib/validations/goal'

export function useGoals() {
  const queryClient = useQueryClient()

  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['goals'] })
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: GoalFormData) => createGoalService(data),
    onSuccess: () => invalidateAll(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GoalFormData> }) =>
      updateGoalService(id, data),
    onSuccess: () => invalidateAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoalService(id),
    onSuccess: () => invalidateAll(),
  })

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      addContributionService(id, amount),
    onSuccess: () => invalidateAll(),
  })

  const convertMutation = useMutation({
    mutationFn: (params: ConvertGoalParams) => convertGoalService(params),
    onSuccess: () => invalidateAll(),
  })

  return {
    goals,
    isLoading,
    error,
    createGoal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateGoal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteGoal: deleteMutation.mutateAsync,
    addContribution: contributeMutation.mutateAsync,
    isContributing: contributeMutation.isPending,
    convertGoalToAsset: convertMutation.mutateAsync,
    isConverting: convertMutation.isPending,
  }
}

export type { GoalWithStats }
