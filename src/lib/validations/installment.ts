import { z } from 'zod'

export const installmentSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'A descrição da compra parcelada é obrigatória')
    .max(200, 'A descrição deve ter no máximo 200 caracteres'),
  total_amount: z.number().positive('O valor total deve ser maior que zero'),
  total_installments: z
    .number()
    .int()
    .min(1, 'Mínimo de 1 parcela')
    .max(360, 'Máximo de 360 parcelas'),
  card_id: z.string().uuid().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida'),
  notes: z.string().max(2000).nullable().optional(),
})

export type InstallmentFormData = z.infer<typeof installmentSchema>
