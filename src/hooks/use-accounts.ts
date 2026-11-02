import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAccountsWithBalances,
  createAccount,
  updateAccount,
  toggleArchiveAccount,
  type AccountWithBalance,
} from '@/services/accounts'
import { useAuth } from '@/hooks/use-auth'
import type { AccountFormData } from '@/lib/validations/account'

export function useAccounts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<AccountWithBalance[]>({
    queryKey: ['accounts', user?.id],
    queryFn: fetchAccountsWithBalances,
    enabled: !!user?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: AccountFormData) => createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', user?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountFormData> }) =>
      updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', user?.id] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      toggleArchiveAccount(id, isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', user?.id] })
    },
  })

  return {
    ...query,
    accounts: query.data || [],
    createAccount: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAccount: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    archiveAccount: (id: string) => archiveMutation.mutateAsync({ id, isArchived: true }),
    unarchiveAccount: (id: string) => archiveMutation.mutateAsync({ id, isArchived: false }),
    isArchiving: archiveMutation.isPending,
  }
}
