import { supabase } from '@/lib/supabase'
import type { Asset } from '@/types/database'
import type { AssetFormData } from '@/lib/validations/asset'

export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('acquisition_date', { ascending: false })

  if (error) throw error
  return (data || []) as Asset[]
}

export async function createAsset(data: AssetFormData): Promise<Asset> {
  const { data: created, error } = await supabase
    .from('assets')
    .insert({
      name: data.name.trim(),
      type: data.type,
      acquisition_value: data.acquisition_value,
      current_value: data.current_value,
      acquisition_date: data.acquisition_date,
      goal_id: data.goal_id || null,
      property_id: data.property_id || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as Asset
}

export async function updateAsset(id: string, data: Partial<AssetFormData>): Promise<Asset> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.type !== undefined) payload.type = data.type
  if (data.acquisition_value !== undefined) payload.acquisition_value = data.acquisition_value
  if (data.current_value !== undefined) payload.current_value = data.current_value
  if (data.acquisition_date !== undefined) payload.acquisition_date = data.acquisition_date
  if (data.goal_id !== undefined) payload.goal_id = data.goal_id || null
  if (data.property_id !== undefined) payload.property_id = data.property_id || null
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null

  const { data: updated, error } = await supabase
    .from('assets')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Asset
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

