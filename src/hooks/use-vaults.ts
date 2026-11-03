import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import {
  fetchVaultsWithDetails,
  createVault as createVaultService,
  updateVault as updateVaultService,
  depositToVault as depositToVaultService,
  withdrawFromVault as withdrawFromVaultService,
  toggleArchiveVault as toggleArchiveService,
  type VaultItem,
} from '@/services/vaults'
import type { VaultFormData } from '@/lib/validations/vault'
import { toCents, fromCents, sumCents } from '@/lib/money'

export function useVaults() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: vaults = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vaults', user?.id],
    queryFn: fetchVaultsWithDetails,
    enabled: !!user?.id,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['vaults'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['goals'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: VaultFormData) => createVaultService(data),
    onSuccess: () => invalidateAll(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VaultFormData> }) =>
      updateVaultService(id, data),
    onSuccess: () => invalidateAll(),
  })

  const depositMutation = useMutation({
    mutationFn: (params: {
      vault_id: string
      vault_name: string
      account_id: string
      amount: number
      date: string
      notes?: string | null
    }) => depositToVaultService(params),
    onSuccess: () => invalidateAll(),
  })

  const withdrawMutation = useMutation({
    mutationFn: (params: {
      vault_id: string
      vault_name: string
      account_id: string
      amount: number
      date: string
      notes?: string | null
    }) => withdrawFromVaultService(params),
    onSuccess: () => invalidateAll(),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, is_archived }: { id: string; is_archived: boolean }) =>
      toggleArchiveService(id, is_archived),
    onSuccess: () => invalidateAll(),
  })

  const activeVaults = useMemo(() => vaults.filter((v) => !v.is_archived), [vaults])

  const totals = useMemo(() => {
    let balanceCents = 0
    let targetCents = 0

    activeVaults.forEach((v) => {
      balanceCents = sumCents(balanceCents, toCents(v.current_balance))
      if (v.target_amount > 0) {
        targetCents = sumCents(targetCents, toCents(v.target_amount))
      }
    })

    const totalBalance = fromCents(balanceCents)
    const totalTarget = fromCents(targetCents)
    const overallProgress =
      totalTarget > 0 ? Math.min(100, Math.round((totalBalance / totalTarget) * 100)) : 100

    return {
      totalBalance,
      totalTarget,
      overallProgress,
    }
  }, [activeVaults])

  return {
    vaults,
    activeVaults,
    isLoading,
    error,
    refetch,
    totalBalance: totals.totalBalance,
    totalTarget: totals.totalTarget,
    overallProgress: totals.overallProgress,
    createVault: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateVault: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    depositToVault: depositMutation.mutateAsync,
    isDepositing: depositMutation.isPending,
    withdrawFromVault: withdrawMutation.mutateAsync,
    isWithdrawing: withdrawMutation.isPending,
    archiveVault: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
  }
}

export type { VaultItem }
