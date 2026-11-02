import { z } from 'zod'

export const realEstateAmortizationSchema = z.object({
  property_id: z.string().uuid('Imóvel inválido'),
  amount: z.number().positive('O valor da amortização deve ser maior que zero'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  reduction_type: z.enum(['term', 'installment'] as const),
  notes: z.string().max(1000).nullable().optional(),
})

export type RealEstateAmortizationFormData = z.infer<typeof realEstateAmortizationSchema>

