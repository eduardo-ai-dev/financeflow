import { z } from 'zod'

export const CARD_LIMIT_INCLUDED_MARKER = '[LIMITE_CONTABILIZADO]'

export function encodeInstallmentNotes(
  rawNotes: string | null | undefined,
  alreadyIncludedInLimit?: boolean
): string | null {
  const trimmed = (rawNotes || '').replace(CARD_LIMIT_INCLUDED_MARKER, '').trim()
  if (alreadyIncludedInLimit) {
    return trimmed ? `${CARD_LIMIT_INCLUDED_MARKER} ${trimmed}` : CARD_LIMIT_INCLUDED_MARKER
  }
  return trimmed || null
}

export function isIncludedInCardLimit(notes: string | null | undefined): boolean {
  return Boolean(notes && notes.includes(CARD_LIMIT_INCLUDED_MARKER))
}

export function cleanUserNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const cleaned = notes
    .replace(CARD_LIMIT_INCLUDED_MARKER, '')
    .replace(/\[ANEXO:[^\]]+\]/g, '')
    .trim()
  return cleaned || null
}

const optionalUuid = z
  .union([z.literal(''), z.string().uuid('Seleção inválida')])
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional()

export const installmentSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'A descrição da compra parcelada é obrigatória')
    .max(200, 'A descrição deve ter no máximo 200 caracteres'),
  total_amount: z.number({ error: 'Informe um valor válido' }).positive('O valor total deve ser maior que zero'),
  total_installments: z
    .number({ error: 'Informe a quantidade de parcelas' })
    .int()
    .min(1, 'Mínimo de 1 parcela')
    .max(360, 'Máximo de 360 parcelas'),
  card_id: optionalUuid,
  account_id: optionalUuid,
  category_id: optionalUuid,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida'),
  already_included_in_limit: z.boolean().optional(),
  notes: z.string().max(1950).nullable().optional(),
})

export type InstallmentFormData = z.infer<typeof installmentSchema>
