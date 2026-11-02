import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCreditCardsWithLimits,
  createCreditCard as createCreditCardService,
  updateCreditCard as updateCreditCardService,
  toggleArchiveCreditCard,
  deleteCreditCard as deleteCreditCardService,
  type CreditCardWithLimit,
} from '@/services/cards'
import type { CreditCardFormData } from '@/lib/validations/card'

export function useCards() {
  const queryClient = useQueryClient()

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: fetchCreditCardsWithLimits,
  })

  function invalidateCardData() {
    queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: CreditCardFormData) => createCreditCardService(data),
    onSuccess: () => {
      invalidateCardData()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreditCardFormData> }) =>
      updateCreditCardService(id, data),
    onSuccess: () => {
      invalidateCardData()
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => toggleArchiveCreditCard(id, true),
    onSuccess: () => {
      invalidateCardData()
    },
  })

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => toggleArchiveCreditCard(id, false),
    onSuccess: () => {
      invalidateCardData()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCreditCardService(id),
    onSuccess: () => {
      invalidateCardData()
    },
  })

  return {
    cards,
    isLoading,
    error,
    createCard: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCard: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    archiveCard: archiveMutation.mutateAsync,
    unarchiveCard: unarchiveMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
  }
}

export type { CreditCardWithLimit }
