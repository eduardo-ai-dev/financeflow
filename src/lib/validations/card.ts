import { z } from 'zod'

export const cardBrands = [
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'visa', label: 'Visa' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'American Express' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'other', label: 'Outra Bandeira' },
] as const

export const cardColors = [
  '#4f46e5', // Indigo
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#059669', // Emerald
  '#d97706', // Amber
  '#e11d48', // Rose
  '#18181b', // Black / Dark Slate (Black card)
]

export const creditCardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do cartão é obrigatório')
    .max(80, 'O nome deve ter no máximo 80 caracteres'),
  institution: z
    .string()
    .max(80, 'A instituição deve ter no máximo 80 caracteres')
    .optional()
    .nullable(),
  brand: z.enum(['mastercard', 'visa', 'elo', 'amex', 'hipercard', 'other'] as const),
  limit_amount: z.number().positive('O limite deve ser maior que zero'),
  closing_day: z
    .number()
    .int()
    .min(1, 'Dia de fechamento deve ser entre 1 e 31')
    .max(31, 'Dia de fechamento deve ser entre 1 e 31'),
  due_day: z
    .number()
    .int()
    .min(1, 'Dia de vencimento deve ser entre 1 e 31')
    .max(31, 'Dia de vencimento deve ser entre 1 e 31'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  default_account_id: z.string().uuid().nullable().optional(),
})

export type CreditCardFormData = z.infer<typeof creditCardSchema>
