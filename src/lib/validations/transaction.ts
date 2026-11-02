import { z } from 'zod'

export const transactionSchema = z
  .object({
    kind: z.enum(['income', 'expense', 'transfer'] as const),
    description: z
      .string()
      .trim()
      .min(1, 'A descrição é obrigatória')
      .max(200, 'A descrição deve ter no máximo 200 caracteres'),
    amount: z.number().positive('O valor deve ser maior que zero'),
    account_id: z.string().uuid('Selecione a conta'),
    to_account_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    status: z.enum(['pending', 'completed'] as const),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida'),
    paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de efetivação inválida').nullable().optional(),
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
