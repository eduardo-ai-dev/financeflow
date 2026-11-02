import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAssets,
  createAsset as createAssetService,
  updateAsset as updateAssetService,
  deleteAsset as deleteAssetService,
} from '@/services/assets'
import type { Asset } from '@/types/database'
import type { AssetFormData } from '@/lib/validations/asset'

export function useAssets() {
  const queryClient = useQueryClient()

  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['goals'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: AssetFormData) => createAssetService(data),
    onSuccess: () => invalidateAll(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssetFormData> }) =>
      updateAssetService(id, data),
    onSuccess: () => invalidateAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAssetService(id),
    onSuccess: () => invalidateAll(),
  })

  return {
    assets,
    isLoading,
    error,
    createAsset: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAsset: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAsset: deleteMutation.mutateAsync,
  }
}

export type { Asset }

