import { z } from 'zod'

export const realEstatePropertySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome / identificação do imóvel é obrigatório')
    .max(120, 'Máximo de 120 caracteres'),
  builder: z.string().max(100).nullable().optional(),
  unit: z.string().max(60).nullable().optional(),
  contract_value: z.number().positive('O valor de contrato deve ser maior que zero'),
  current_market_value: z.number().positive('O valor de mercado deve ser positivo').nullable().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de compra inválida'),
  keys_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de entrega inválida').nullable().optional(),
  status: z.enum(['planning', 'under_construction', 'ready', 'delivered'] as const),
  down_payment_total: z.number().min(0, 'Valor da entrada não pode ser negativo'),
  down_payment_paid: z.number().min(0, 'Entrada paga não pode ser negativa'),
  financed_amount: z.number().min(0, 'Valor financiado não pode ser negativo'),
  bank: z.string().max(80).nullable().optional(),
  amortization_system: z.enum(['sac', 'price'] as const),
  annual_interest_rate: z.number().min(0, 'Taxa de juros inválida').max(1, 'A taxa deve estar em formato decimal (ex.: 0.095 para 9.5% a.a.)'),
  total_term_months: z.number().int().min(1, 'Prazo mínimo de 1 mês').max(420, 'Prazo máximo de 420 meses'),
  paid_months: z.number().int().min(0, 'Meses pagos não pode ser negativo'),
  construction_index: z.enum(['INCC', 'IPCA', 'CUB', 'IGP-M', 'OUTRO'] as const),
  construction_fees_paid: z.number().min(0, 'Juros de obra pagos não pode ser negativo'),
  additional_costs_paid: z.number().min(0, 'Custos adicionais não podem ser negativos'),
  notes: z.string().max(4000).nullable().optional(),
})

export type RealEstatePropertyFormData = z.infer<typeof realEstatePropertySchema>

