import { z } from 'zod'

export const investmentTypes = [
  { value: 'fixed_income', label: 'Renda Fixa (CDB, LCI, LCA, Tesouro)' },
  { value: 'stocks', label: 'Ações Nacionais' },
  { value: 'reits', label: 'Fundos Imobiliários (FIIs)' },
  { value: 'etf', label: 'ETFs / BDRs / Exterior' },
  { value: 'crypto', label: 'Criptoativos' },
  { value: 'funds', label: 'Fundos de Investimento' },
  { value: 'pension', label: 'Previdência Privada' },
  { value: 'other', label: 'Outro Ativo Financeiro' },
] as const

export const liquidityTypes = [
  { value: 'daily', label: 'Liquidez Diária (D+0 / Imediata)' },
  { value: 'd_plus_1', label: 'Curto Prazo (D+1 a D+5)' },
  { value: 'd_plus_30', label: 'Médio Prazo (D+30 ou superior)' },
  { value: 'at_maturity', label: 'Apenas no Vencimento' },
  { value: 'locked', label: 'Carência / Bloqueado' },
] as const

export const investmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do investimento é obrigatório')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  ticker: z.string().max(20).nullable().optional(),
  type: z.enum([
    'fixed_income',
    'stocks',
    'reits',
    'etf',
    'crypto',
    'funds',
    'pension',
    'other',
  ] as const),
  institution: z
    .string()
    .trim()
    .min(1, 'A corretora ou banco é obrigatório')
    .max(80, 'A instituição deve ter no máximo 80 caracteres'),
  initial_amount: z.number().min(0, 'O valor inicial não pode ser negativo'),
  total_invested: z.number().min(0, 'O custo total não pode ser negativo'),
  current_amount: z.number().min(0, 'O saldo atual não pode ser negativo'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início inválida'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida').nullable().optional(),
  liquidity: z.enum(['daily', 'd_plus_1', 'd_plus_30', 'at_maturity', 'locked'] as const),
  benchmark: z.string().max(40).nullable().optional(),
  rate: z.string().max(60).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export type InvestmentFormData = z.infer<typeof investmentSchema>

export const investmentTxSchema = z.object({
  investment_id: z.string().uuid(),
  type: z.enum(['contribution', 'redemption', 'dividend', 'interest_on_equity', 'yield'] as const),
  amount: z.number().positive('O valor da movimentação deve ser maior que zero'),
  shares_quantity: z.number().min(0).nullable().optional(),
  unit_price: z.number().min(0).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  account_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export type InvestmentTxFormData = z.infer<typeof investmentTxSchema>

