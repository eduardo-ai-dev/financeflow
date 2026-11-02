import { z } from 'zod'

export const expenseClassifications = [
  {
    value: 'fixed',
    label: 'Fixo',
    description: 'Aluguel, condomínio, internet, escola, planos recorrentes',
  },
  {
    value: 'variable',
    label: 'Variável',
    description: 'Supermercado, alimentação, combustível, lazer, consumo',
  },
  {
    value: 'occasional',
    label: 'Eventual',
    description: 'Presentes, roupas, manutenção pontual, viagens planejadas',
  },
  {
    value: 'extraordinary',
    label: 'Extraordinário',
    description: 'Emergências médicas, imprevistos, multas, reparos urgentes',
  },
] as const

export const transactionSchema = z
  .object({
    kind: z.enum(['income', 'expense', 'transfer'] as const),
    description: z
      .string()
      .trim()
      .min(1, 'A descrição é obrigatória')
      .max(200, 'A descrição deve ter no máximo 200 caracteres'),
    amount: z.number().positive('O valor deve ser maior que zero'),
    account_id: z.string().uuid('Selecione uma conta bancária'),
    to_account_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    expense_classification: z
      .enum(['fixed', 'variable', 'occasional', 'extraordinary'] as const)
      .nullable()
      .optional(),
    status: z.enum(['pending', 'completed'] as const),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida'),
    paid_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de efetivação inválida')
      .nullable()
      .optional(),
    notes: z.string().max(2000, 'Máximo de 2000 caracteres').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.kind === 'transfer') {
        return !!data.to_account_id && data.to_account_id !== data.account_id
      }
      return true
    },
    {
      message: 'Selecione uma conta de destino diferente da conta de origem',
      path: ['to_account_id'],
    }
  )

export type TransactionFormData = z.infer<typeof transactionSchema>
