import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTransactions,
  createTransaction as createTransactionService,
  updateTransaction as updateTransactionService,
  markTransactionCompleted,
  markTransactionPending,
  deleteTransaction as deleteTransactionService,
  importTransactionsBatch as importTransactionsBatchService,
  type BulkImportTransactionInput,
  type TransactionFilters,
  type TransactionWithDetails,
} from '@/services/transactions'
import { useAuth } from '@/hooks/use-auth'
import type { TransactionFormData } from '@/lib/validations/transaction'

export function useTransactions(filters: TransactionFilters = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const queryKey = ['transactions', user?.id, filters]

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchTransactions(filters),
    enabled: !!user?.id,
  })

  function invalidateAllFinancialData() {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: TransactionFormData) => createTransactionService(data),
    onSuccess: () => {
      invalidateAllFinancialData()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionFormData> }) =>
      updateTransactionService(id, data),
    onSuccess: () => {
      invalidateAllFinancialData()
    },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, paidDate }: { id: string; paidDate?: string }) =>
      markTransactionCompleted(id, paidDate),
    onSuccess: () => {
      invalidateAllFinancialData()
    },
  })

  const pendingMutation = useMutation({
    mutationFn: (id: string) => markTransactionPending(id),
    onSuccess: () => {
      invalidateAllFinancialData()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransactionService(id),
    onSuccess: () => {
      invalidateAllFinancialData()
    },
  })

  const importBatchMutation = useMutation({
    mutationFn: (rows: BulkImportTransactionInput[]) => importTransactionsBatchService(rows),
    onSuccess: () => {
      invalidateAllFinancialData()
    },
  })

  return {
    transactions,
    isLoading,
    error,
    refetch,
    createTransaction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTransaction: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    markAsCompleted: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
    markAsPending: pendingMutation.mutateAsync,
    isPendingAction: pendingMutation.isPending,
    deleteTransaction: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    importBatch: importBatchMutation.mutateAsync,
    isImportingBatch: importBatchMutation.isPending,
  }
}

export type { TransactionWithDetails }
