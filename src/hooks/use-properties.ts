import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProperties,
  createProperty as createPropertyService,
  updateProperty as updatePropertyService,
  deleteProperty as deletePropertyService,
  addAmortization as addAmortizationService,
  type PropertyWithCalculations,
} from '@/services/properties'
import { useAuth } from '@/hooks/use-auth'
import type { RealEstatePropertyFormData } from '@/lib/validations/property'
import type { RealEstateAmortizationFormData } from '@/lib/validations/amortization'
import type { RealEstateProperty } from '@/types/database'

export function useProperties() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['real-estate-properties', user?.id],
    queryFn: fetchProperties,
    enabled: !!user?.id,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: RealEstatePropertyFormData) => createPropertyService(data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RealEstatePropertyFormData> }) =>
      updatePropertyService(id, data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePropertyService(id),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const amortizeMutation = useMutation({
    mutationFn: ({
      data,
      property,
    }: {
      data: RealEstateAmortizationFormData
      property: RealEstateProperty
    }) => addAmortizationService(data, property),
    onSuccess: () => {
      invalidateAll()
    },
  })

  return {
    properties,
    isLoading,
    error,
    createProperty: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateProperty: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProperty: deleteMutation.mutateAsync,
    addAmortization: amortizeMutation.mutateAsync,
    isAmortizing: amortizeMutation.isPending,
  }
}

export type { PropertyWithCalculations }
