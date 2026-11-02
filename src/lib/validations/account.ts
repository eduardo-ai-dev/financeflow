import { z } from 'zod'

export const accountTypes = [
  { value: 'digital', label: 'Conta Digital' },
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira Digital' },
  { value: 'cash', label: 'Dinheiro em Espécie' },
  { value: 'brokerage', label: 'Investimento / Corretora' },
  { value: 'vault', label: 'Cofre / Reserva' },
] as const

export const accountColors = [
  '#10b981', // emerald
  '#059669', // emerald dark
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#64748b', // slate
]

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome da conta é obrigatório')
    .max(80, 'O nome deve ter no máximo 80 caracteres'),
  institution: z
    .string()
    .max(80, 'A instituição deve ter no máximo 80 caracteres')
    .optional()
    .nullable(),
  type: z.enum(
    ['checking', 'savings', 'digital', 'cash', 'wallet', 'brokerage', 'vault'] as const
  ),
  opening_balance: z.number(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (deve ser formato #RRGGBB)'),
})

export type AccountFormData = z.infer<typeof accountSchema>
