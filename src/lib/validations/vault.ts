import { z } from 'zod'

export const VAULT_PURPOSES = [
  {
    value: 'emergency',
    label: 'Reserva de Emergência',
    description: '3 a 12 meses de custos essenciais para imprevistos e segurança familiar.',
    color: '#10b981',
    badge: 'Essencial',
  },
  {
    value: 'opportunity',
    label: 'Reserva de Oportunidade',
    description: 'Caixa estratégico para comprar ativos em momentos de baixa ou promoções.',
    color: '#3b82f6',
    badge: 'Estratégico',
  },
  {
    value: 'taxes',
    label: 'Despesas Periódicas / Impostos',
    description: 'Provisão mensal para IPVA, IPTU, seguros, matrícula escolar e IRPF.',
    color: '#f59e0b',
    badge: 'Previsibilidade',
  },
  {
    value: 'goals',
    label: 'Projetos e Sonhos',
    description: 'Viagem dos sonhos, casamento, reforma, intercâmbio ou compra planejada.',
    color: '#8b5cf6',
    badge: 'Objetivo',
  },
  {
    value: 'free',
    label: 'Cofre Livre / Outros',
    description: 'Alocação flexível e separada da conta operacional do dia a dia.',
    color: '#06b6d4',
    badge: 'Flexível',
  },
] as const

export type VaultPurpose = (typeof VAULT_PURPOSES)[number]['value']

export const vaultSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do cofre é obrigatório')
    .max(80, 'O nome deve ter no máximo 80 caracteres'),
  institution: z
    .string()
    .max(80, 'A instituição deve ter no máximo 80 caracteres')
    .optional()
    .nullable(),
  purpose: z.enum(['emergency', 'opportunity', 'taxes', 'goals', 'free'] as const),
  target_amount: z
    .number()
    .min(0, 'A meta deve ser zero ou maior')
    .max(100_000_000, 'Valor excede o limite permitido'),
  opening_balance: z
    .number()
    .min(0, 'O saldo inicial não pode ser negativo')
    .max(100_000_000, 'Valor excede o limite permitido'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  yield_rate: z
    .string()
    .max(60, 'Texto muito longo')
    .optional()
    .nullable(),
  liquidity: z
    .enum(['immediate', 'daily', 'd_plus_1', 'd_plus_30', 'locked'] as const),
  notes: z
    .string()
    .max(1000, 'Máximo de 1000 caracteres')
    .optional()
    .nullable(),
})

export type VaultFormData = z.infer<typeof vaultSchema>

export const vaultTransferSchema = z.object({
  vault_id: z.string().uuid('Selecione o cofre'),
  account_id: z.string().uuid('Selecione a conta corrente'),
  amount: z
    .number()
    .positive('O valor da movimentação deve ser maior que zero')
    .max(100_000_000, 'Valor muito alto'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  notes: z.string().max(200, 'Máximo de 200 caracteres').optional().nullable(),
})

export type VaultTransferFormData = z.infer<typeof vaultTransferSchema>
