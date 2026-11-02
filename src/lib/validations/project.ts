import { z } from 'zod'

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do projeto é obrigatório')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  description: z.string().max(2000).nullable().optional(),
  target_budget: z.number().min(0, 'O orçamento não pode ser negativo'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida').nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida').nullable().optional(),
  status: z.enum(['planning', 'in_progress', 'completed', 'canceled'] as const),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  icon: z.string().max(40),
})

export type ProjectFormData = z.infer<typeof projectSchema>
