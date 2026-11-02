import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchInvoices,
  payInvoice as payInvoiceService,
  type InvoiceWithTotals,
} from '@/services/invoices'

export function useInvoices(cardId?: string) {
  const queryClient = useQueryClient()

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', cardId],
    queryFn: () => fetchInvoices(cardId),
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const payMutation = useMutation({
    mutationFn: ({
      invoiceId,
      accountId,
      paidDate,
    }: {
      invoiceId: string
      accountId: string
      paidDate?: string
    }) => payInvoiceService(invoiceId, accountId, paidDate),
    onSuccess: () => {
      invalidateAll()
    },
  })

  return {
    invoices,
    isLoading,
    error,
    payInvoice: payMutation.mutateAsync,
    isPaying: payMutation.isPending,
  }
}

export type { InvoiceWithTotals }
