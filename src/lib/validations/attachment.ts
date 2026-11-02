import { z } from 'zod'

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const

export type AllowedAttachmentMime = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]

export const attachmentMetaSchema = z.object({
  path: z
    .string()
    .trim()
    .min(3, 'Caminho do comprovante inválido')
    .max(400, 'Caminho do comprovante excede o limite')
    .refine((val) => !val.includes('..') && !val.startsWith('/'), {
      message: 'Caminho de arquivo inválido',
    }),
  name: z
    .string()
    .trim()
    .min(1, 'Nome do arquivo é obrigatório')
    .max(140, 'Nome do arquivo muito longo'),
  mime: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES, {
    error: 'Formato não permitido. Envie PDF, PNG, JPG ou WEBP.',
  }),
  size: z
    .number()
    .int()
    .positive('Arquivo vazio não permitido')
    .max(MAX_ATTACHMENT_SIZE_BYTES, 'O arquivo deve ter no máximo 5 MB'),
})

export type AttachmentMeta = z.infer<typeof attachmentMetaSchema>

export const uploadFileValidationSchema = z.object({
  name: z.string().trim().min(1, 'Arquivo sem nome'),
  type: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES, {
    error: 'Formato não suportado. Use PDF, PNG, JPG ou WEBP.',
  }),
  size: z
    .number()
    .positive('O arquivo selecionado está vazio.')
    .max(MAX_ATTACHMENT_SIZE_BYTES, 'O comprovante deve ter no máximo 5 MB.'),
})

export function validateAttachmentFile(file: {
  name: string
  type: string
  size: number
}): { valid: true } | { valid: false; error: string } {
  const parsed = uploadFileValidationSchema.safeParse({
    name: file.name,
    type: file.type,
    size: file.size,
  })
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues[0]?.message || 'Arquivo inválido.',
    }
  }
  return { valid: true }
}

/**
 * Sanitiza o nome do arquivo removendo caracteres especiais, acentos e separadores de diretório.
 */
export function sanitizeAttachmentFileName(originalName: string): string {
  const normalized = originalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\.+/g, '.')
    .trim()

  const lastDot = normalized.lastIndexOf('.')
  const ext =
    lastDot > 0
      ? normalized
          .slice(lastDot)
          .toLowerCase()
          .replace(/[^.a-z0-9]/g, '')
      : ''
  const base = (lastDot > 0 ? normalized.slice(0, lastDot) : normalized)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60)

  return `${base || 'comprovante'}${ext || '.bin'}`
}

/**
 * Garante que o caminho do objeto pertence estritamente à pasta raiz do usuário autenticado.
 */
export function isValidUserAttachmentPath(path: string, userId: string): boolean {
  if (!path || !userId) return false
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) return false
  const segments = path.split('/')
  return segments.length >= 2 && segments[0] === userId && segments.every((s) => s.length > 0)
}

const ATTACHMENT_TAG_REGEX = /\[ANEXO:([^\]]+)\]/g

/**
 * Extrai metadados de comprovante codificados no campo de observações, se presentes.
 */
export function extractAttachmentFromNotes(
  notes: string | null | undefined
): AttachmentMeta | null {
  if (!notes) return null
  const match = /\[ANEXO:([^\]]+)\]/.exec(notes)
  if (!match?.[1]) return null

  const parts = match[1].split('|')
  if (parts.length < 4) return null

  const [rawPath, rawName, rawMime, rawSize] = parts
  const parsed = attachmentMetaSchema.safeParse({
    path: decodeURIComponent(rawPath),
    name: decodeURIComponent(rawName),
    mime: rawMime,
    size: Number(rawSize),
  })

  return parsed.success ? parsed.data : null
}

/**
 * Remove marcadores internos de anexo de uma string de observações.
 */
export function stripAttachmentMarker(notes: string | null | undefined): string {
  if (!notes) return ''
  return notes.replace(ATTACHMENT_TAG_REGEX, '').trim()
}

/**
 * Combina as observações do usuário com o marcador seguro de comprovante anexado.
 */
export function encodeTransactionNotesWithAttachment(
  userNotes: string | null | undefined,
  attachment: AttachmentMeta | null | undefined
): string | null {
  const cleanText = stripAttachmentMarker(userNotes)
  if (!attachment) {
    return cleanText || null
  }

  const parsed = attachmentMetaSchema.safeParse(attachment)
  if (!parsed.success) {
    return cleanText || null
  }

  const encodedTag = `[ANEXO:${encodeURIComponent(parsed.data.path)}|${encodeURIComponent(
    parsed.data.name
  )}|${parsed.data.mime}|${parsed.data.size}]`

  return cleanText ? `${encodedTag} ${cleanText}` : encodedTag
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
