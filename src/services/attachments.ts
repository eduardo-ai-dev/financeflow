import { supabase } from '@/lib/supabase'
import {
  validateAttachmentFile,
  sanitizeAttachmentFileName,
  isValidUserAttachmentPath,
  type AttachmentMeta,
   type AllowedAttachmentMime,
} from '@/lib/validations/attachment'

const STORAGE_BUCKET = 'user-attachments'
const SIGNED_URL_TTL_SECONDS = 300 // 5 minutos

export async function uploadReceiptAttachment(file: File): Promise<AttachmentMeta> {
  const validation = validateAttachmentFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Sua sessão expirou. Faça login novamente para anexar comprovantes.')
  }

  const safeName = sanitizeAttachmentFileName(file.name)
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const objectPath = `${user.id}/comprovantes/${uniquePrefix}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error('Não foi possível enviar o comprovante. Tente novamente em instantes.')
  }

  return {
    path: objectPath,
    name: file.name.trim().slice(0, 140),
    mime: file.type as AllowedAttachmentMime,
    size: file.size,
  }
}

export async function createReceiptSignedUrl(path: string): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Sua sessão expirou. Faça login novamente para visualizar o comprovante.')
  }

  if (!isValidUserAttachmentPath(path, user.id)) {
    throw new Error('Acesso negado ao comprovante solicitado.')
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error('Não foi possível abrir o comprovante no momento.')
  }

  return data.signedUrl
}

export async function removeReceiptAttachment(path: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isValidUserAttachmentPath(path, user.id)) {
    return
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([path])
}
