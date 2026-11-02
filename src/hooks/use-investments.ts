import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchInvestments,
  createInvestment as createInvestmentService,
  updateInvestment as updateInvestmentService,
  deleteInvestment as deleteInvestmentService,
  fetchInvestmentTransactions,
  addInvestmentTransaction as addTxService,
  type InvestmentWithStats,
} from '@/services/investments'
import { useAuth } from '@/hooks/use-auth'
import type { InvestmentFormData, InvestmentTxFormData } from '@/lib/validations/investment'

export function useInvestments(selectedInvestmentId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: investments = [], isLoading, error } = useQuery({
    queryKey: ['investments', user?.id],
    queryFn: fetchInvestments,
    enabled: !!user?.id,
  })

  const { data: transactions = [], isLoading: isLoadingTx } = useQuery({
    queryKey: ['investment-transactions', user?.id, selectedInvestmentId],
    queryFn: () => fetchInvestmentTransactions(selectedInvestmentId),
    enabled: !!user?.id,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['investments'] })
    queryClient.invalidateQueries({ queryKey: ['investment-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['patrimony'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: InvestmentFormData) => createInvestmentService(data),
    onSuccess: () => invalidateAll(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InvestmentFormData> }) =>
      updateInvestmentService(id, data),
    onSuccess: () => invalidateAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvestmentService(id),
    onSuccess: () => invalidateAll(),
  })

  const addTxMutation = useMutation({
    mutationFn: (data: InvestmentTxFormData) => addTxService(data),
    onSuccess: () => invalidateAll(),
  })

  return {
    investments,
    transactions,
    isLoading: isLoading || isLoadingTx,
    error,
    createInvestment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateInvestment: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteInvestment: deleteMutation.mutateAsync,
    addTransaction: addTxMutation.mutateAsync,
    isAddingTx: addTxMutation.isPending,
  }
}

export type { InvestmentWithStats }
