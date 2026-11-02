import { z } from 'zod'

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome da categoria é obrigatório')
    .max(80, 'O nome deve ter no máximo 80 caracteres'),
  kind: z.enum(['income', 'expense'] as const),
  parent_id: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (deve ser hexadecimal no formato #RRGGBB)'),
  icon: z.string().max(40),
})

export type CategoryFormData = z.infer<typeof categorySchema>

export const categoryColors = [
  '#10b981', // Emerald
  '#059669', // Emerald dark
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#64748b', // Slate
]

export const categoryIcons = [
  'Tag',
  'Utensils',
  'Home',
  'Car',
  'HeartPulse',
  'GraduationCap',
  'Gamepad2',
  'ShoppingBag',
  'Receipt',
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'Coins',
  'Plane',
  'Gift',
  'Wrench',
  'Phone',
  'ShieldCheck',
  'Sparkles',
  'Dumbbell',
]
