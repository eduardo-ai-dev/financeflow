import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchInstallments,
  createInstallment as createInstallmentService,
  cancelInstallment as cancelInstallmentService,
  type InstallmentWithDetails,
} from '@/services/installments'
import type { InstallmentFormData } from '@/lib/validations/installment'

export function useInstallments(status?: string) {
  const queryClient = useQueryClient()

  const { data: installments = [], isLoading, error } = useQuery({
    queryKey: ['installments', status],
    queryFn: () => fetchInstallments(status),
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['installments'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: InstallmentFormData) => createInstallmentService(data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelInstallmentService(id),
    onSuccess: () => {
      invalidateAll()
    },
  })

  return {
    installments,
    isLoading,
    error,
    createInstallment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    cancelInstallment: cancelMutation.mutateAsync,
    isCanceling: cancelMutation.isPending,
  }
}

export type { InstallmentWithDetails }

