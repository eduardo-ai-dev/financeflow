import { z } from 'zod'

export const liabilityTypes = [
  { value: 'loan', label: 'Empréstimo Pessoal / Bancário' },
  { value: 'financing', label: 'Financiamento (Veículo, Outros)' },
  { value: 'debt', label: 'Dívida Renegociada / Cartão' },
  { value: 'tax', label: 'Tributos / Impostos Parcelados' },
  { value: 'other', label: 'Outro Passivo / Obrigação' },
] as const

export const liabilitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome da obrigação ou passivo é obrigatório')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  type: z.enum(['loan', 'financing', 'debt', 'tax', 'other'] as const),
  total_amount: z.number().min(0, 'O valor total não pode ser negativo'),
  current_balance: z.number().min(0, 'O saldo devedor não pode ser negativo'),
  monthly_payment: z.number().min(0).nullable().optional(),
  remaining_installments: z.number().int().min(0).nullable().optional(),
  interest_rate_monthly: z.number().min(0).nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida').nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export type LiabilityFormData = z.infer<typeof liabilitySchema>

