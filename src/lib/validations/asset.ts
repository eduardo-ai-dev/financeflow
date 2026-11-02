import { z } from 'zod'

export const assetTypes = [
  { value: 'real_estate', label: 'Imóvel' },
  { value: 'vehicle', label: 'Veículo' },
  { value: 'electronics', label: 'Eletrônico / Informática' },
  { value: 'furniture', label: 'Móveis / Decoração' },
  { value: 'jewelry', label: 'Joias / Relógios' },
  { value: 'other', label: 'Outro Ativo' },
] as const

export const assetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do bem ou ativo é obrigatório')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  type: z.enum(['real_estate', 'vehicle', 'electronics', 'furniture', 'jewelry', 'other'] as const),
  acquisition_value: z.number().min(0, 'O valor de aquisição não pode ser negativo'),
  current_value: z.number().min(0, 'O valor atual de mercado não pode ser negativo'),
  acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de aquisição inválida'),
  goal_id: z.string().uuid().nullable().optional(),
  property_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export type AssetFormData = z.infer<typeof assetSchema>

