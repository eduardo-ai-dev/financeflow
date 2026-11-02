import { z } from 'zod'

export const goalPriorities = [
  { value: 'essential', label: 'Essencial (Alta prioridade)' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa / Desejo' },
] as const

export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do item ou objetivo é obrigatório')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  brand: z.string().max(80).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'essential'] as const),
  target_amount: z.number().positive('O valor alvo deve ser maior que zero'),
  current_amount: z.number().min(0, 'O valor reservado não pode ser negativo'),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data alvo inválida').nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'canceled'] as const),
  image_url: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export type GoalFormData = z.infer<typeof goalSchema>
