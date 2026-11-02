import { z } from 'zod'

const emptyStrToNull = (val: string) => (val.trim() === '' ? null : val.trim())

export const goalPriorities = [
  { value: 'essential', label: 'Essencial', hint: 'Prioridade máxima' },
  { value: 'high', label: 'Alta', hint: 'Importante' },
  { value: 'medium', label: 'Média', hint: 'Equilibrada' },
  { value: 'low', label: 'Desejo', hint: 'Longo prazo' },
] as const

export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do item ou objetivo é obrigatório')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  brand: z.string().max(80).transform(emptyStrToNull).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'essential'] as const),
  target_amount: z
    .number({ error: 'Informe um valor alvo válido' })
    .positive('O valor alvo deve ser maior que zero'),
  current_amount: z
    .number({ error: 'Informe um valor válido' })
    .min(0, 'O valor reservado não pode ser negativo'),
  target_date: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data alvo inválida')])
    .transform(emptyStrToNull)
    .nullable()
    .optional(),
  account_id: z
    .union([z.literal(''), z.string().uuid()])
    .transform(emptyStrToNull)
    .nullable()
    .optional(),
  category_id: z
    .union([z.literal(''), z.string().uuid()])
    .transform(emptyStrToNull)
    .nullable()
    .optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'canceled'] as const),
  image_url: z
    .string()
    .max(1000)
    .refine(
      (val) => val.trim() === '' || /^https?:\/\//i.test(val.trim()),
      'A URL da imagem deve começar com https:// ou http://'
    )
    .transform(emptyStrToNull)
    .nullable()
    .optional(),
  notes: z.string().max(2000).transform(emptyStrToNull).nullable().optional(),
})

export type GoalFormData = z.infer<typeof goalSchema>
