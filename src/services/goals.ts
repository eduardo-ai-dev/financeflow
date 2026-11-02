import { supabase } from '@/lib/supabase'
import type { Goal, Asset, AssetType } from '@/types/database'
import type { GoalFormData } from '@/lib/validations/goal'
import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'

export interface GoalWithStats extends Goal {
  progress_percent: number
  remaining_amount: number
  asset?: Asset | null
}

export async function fetchGoals(): Promise<GoalWithStats[]> {
  const [goalsRes, assetsRes] = await Promise.all([
    supabase.from('goals').select('*').order('created_at', { ascending: false }),
    supabase.from('assets').select('*'),
  ])

  if (goalsRes.error) throw goalsRes.error
  const goals = (goalsRes.data || []) as Goal[]
  const assets = (assetsRes.data || []) as Asset[]

  const assetMap = new Map<string, Asset>()
  assets.forEach((a) => {
    assetMap.set(a.id, a)
  })

  return goals.map((g) => {
    const targetCents = toCents(g.target_amount)
    const currentCents = toCents(g.current_amount)
    const remainingCents = Math.max(0, subtractCents(targetCents, currentCents))
    const progress = targetCents > 0 ? Math.min(100, Math.round((currentCents / targetCents) * 100)) : 0

    return {
      ...g,
      progress_percent: progress,
      remaining_amount: fromCents(remainingCents),
      asset: g.asset_id ? assetMap.get(g.asset_id) || null : null,
    }
  })
}

export async function createGoal(data: GoalFormData): Promise<Goal> {
  const { data: created, error } = await supabase
    .from('goals')
    .insert({
      name: data.name.trim(),
      brand: data.brand?.trim() || null,
      priority: data.priority,
      target_amount: data.target_amount,
      current_amount: data.current_amount || 0,
      target_date: data.target_date || null,
      account_id: data.account_id || null,
      category_id: data.category_id || null,
      status: data.status,
      image_url: data.image_url?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as Goal
}

export async function updateGoal(id: string, data: Partial<GoalFormData>): Promise<Goal> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.brand !== undefined) payload.brand = data.brand?.trim() || null
  if (data.priority !== undefined) payload.priority = data.priority
  if (data.target_amount !== undefined) payload.target_amount = data.target_amount
  if (data.current_amount !== undefined) payload.current_amount = data.current_amount
  if (data.target_date !== undefined) payload.target_date = data.target_date || null
  if (data.account_id !== undefined) payload.account_id = data.account_id || null
  if (data.category_id !== undefined) payload.category_id = data.category_id || null
  if (data.status !== undefined) payload.status = data.status
  if (data.image_url !== undefined) payload.image_url = data.image_url?.trim() || null
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null

  const { data: updated, error } = await supabase
    .from('goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Goal
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function addGoalContribution(id: string, additionalAmount: number): Promise<Goal> {
  // Busca o valor atual da meta
  const { data: currentGoal, error: fetchErr } = await supabase
    .from('goals')
    .select('current_amount, target_amount')
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr

  const curCents = toCents(currentGoal.current_amount)
  const addCents = toCents(additionalAmount)
  const newCents = sumCents(curCents, addCents)
  const newAmount = fromCents(newCents)

  const isCompleted = newCents >= toCents(currentGoal.target_amount)

  const { data: updated, error } = await supabase
    .from('goals')
    .update({
      current_amount: newAmount,
      ...(isCompleted ? { status: 'completed' } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Goal
}

export interface ConvertGoalParams {
  goalId: string
  finalPrice: number
  purchaseDate: string
  assetName: string
  assetType: AssetType
  accountId?: string | null
  categoryId?: string | null
  notes?: string | null
}

export async function purchaseGoalAndConvertToAsset(params: ConvertGoalParams): Promise<{ goal: Goal; asset: Asset }> {
  // 1. Criar o ativo patrimonial
  const { data: asset, error: assetErr } = await supabase
    .from('assets')
    .insert({
      name: params.assetName.trim(),
      type: params.assetType,
      acquisition_value: params.finalPrice,
      current_value: params.finalPrice,
      acquisition_date: params.purchaseDate,
      goal_id: params.goalId,
      notes: params.notes?.trim() || null,
    })
    .select()
    .single()

  if (assetErr) throw assetErr

  // 2. Atualizar a meta
  const { data: updatedGoal, error: goalErr } = await supabase
    .from('goals')
    .update({
      status: 'completed',
      purchased_amount: params.finalPrice,
      purchased_date: params.purchaseDate,
      converted_to_asset: true,
      asset_id: asset.id,
    })
    .eq('id', params.goalId)
    .select()
    .single()

  if (goalErr) throw goalErr

  // 3. Se fornecido accountId, registrar despesa real de caixa
  if (params.accountId) {
    const { error: txErr } = await supabase.from('transactions').insert({
      kind: 'expense',
      status: 'completed',
      description: `Aquisição de Meta: ${params.assetName.trim()}`,
      amount: params.finalPrice,
      account_id: params.accountId,
      category_id: params.categoryId || null,
      due_date: params.purchaseDate,
      paid_date: params.purchaseDate,
      notes: `Convertido automaticamente em bem patrimonial #${asset.id}`,
    })
    if (txErr) {
      console.error('Erro ao registrar transação da meta:', txErr)
      // Não aborta o fluxo se a meta já virou ativo
    }
  }

  return { goal: updatedGoal as Goal, asset: asset as Asset }
}

