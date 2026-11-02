import { supabase } from '@/lib/supabase'
import type { Project, Transaction } from '@/types/database'
import type { ProjectFormData } from '@/lib/validations/project'
import { toCents, fromCents, sumCents, subtractCents } from '@/lib/money'

export interface ProjectWithStats extends Project {
  spent_amount: number
  remaining_budget: number
  progress_percent: number
  transactions?: Transaction[]
}

export async function fetchProjects(): Promise<ProjectWithStats[]> {
  const [projectsRes, txsRes] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').not('project_id', 'is', null),
  ])

  if (projectsRes.error) throw projectsRes.error
  const projects = (projectsRes.data || []) as Project[]
  const txs = (txsRes.data || []) as Transaction[]

  const projectTxsMap = new Map<string, Transaction[]>()
  txs.forEach((tx) => {
    if (!tx.project_id) return
    const list = projectTxsMap.get(tx.project_id) || []
    list.push(tx)
    projectTxsMap.set(tx.project_id, list)
  })

  return projects.map((p) => {
    const pTxs = projectTxsMap.get(p.id) || []
    let spentCents = 0
    pTxs.forEach((t) => {
      // Considera transações de despesa ou compra a crédito que não foram canceladas
      if (t.status !== 'canceled' && (t.kind === 'expense' || t.kind === 'card_purchase')) {
        spentCents = sumCents(spentCents, toCents(t.amount))
      }
    })

    const spent = fromCents(spentCents)
    const targetCents = toCents(p.target_budget)
    const remainingCents = Math.max(0, subtractCents(targetCents, spentCents))
    const progress = p.target_budget > 0 ? Math.min(100, Math.round((spent / p.target_budget) * 100)) : 0

    return {
      ...p,
      spent_amount: spent,
      remaining_budget: fromCents(remainingCents),
      progress_percent: progress,
      transactions: pTxs,
    }
  })
}

export async function createProject(data: ProjectFormData): Promise<Project> {
  const { data: created, error } = await supabase
    .from('projects')
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      target_budget: data.target_budget,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      status: data.status,
      color: data.color,
      icon: data.icon,
    })
    .select()
    .single()

  if (error) throw error
  return created as Project
}

export async function updateProject(
  id: string,
  data: Partial<ProjectFormData>
): Promise<Project> {
  const { data: updated, error } = await supabase
    .from('projects')
    .update({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.target_budget !== undefined ? { target_budget: data.target_budget } : {}),
      ...(data.start_date !== undefined ? { start_date: data.start_date || null } : {}),
      ...(data.end_date !== undefined ? { end_date: data.end_date || null } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.color ? { color: data.color } : {}),
      ...(data.icon ? { icon: data.icon } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Project
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

