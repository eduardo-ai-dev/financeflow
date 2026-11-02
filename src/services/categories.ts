import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/database'
import type { CategoryFormData } from '@/lib/validations/category'

export interface CategoryWithChildren extends Category {
  children?: Category[]
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_archived', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as Category[]
}

export async function createCategory(data: CategoryFormData): Promise<Category> {
  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      name: data.name.trim(),
      kind: data.kind,
      parent_id: data.parent_id || null,
      color: data.color || '#10b981',
      icon: data.icon || 'Tag',
    })
    .select()
    .single()

  if (error) throw error
  return created as Category
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryFormData>
): Promise<Category> {
  const { data: updated, error } = await supabase
    .from('categories')
    .update({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.color ? { color: data.color } : {}),
      ...(data.icon ? { icon: data.icon } : {}),
      ...(data.parent_id !== undefined ? { parent_id: data.parent_id || null } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Category
}

export async function toggleArchiveCategory(
  id: string,
  is_archived: boolean
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ is_archived })
    .eq('id', id)

  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

interface DefaultCategorySeed {
  name: string
  kind: 'income' | 'expense'
  color: string
  icon: string
  subcategories: string[]
}

const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  // Despesas
  {
    name: 'Alimentação',
    kind: 'expense',
    color: '#f59e0b',
    icon: 'Utensils',
    subcategories: ['Supermercado', 'Restaurantes & Delivery', 'Café & Lanches'],
  },
  {
    name: 'Moradia',
    kind: 'expense',
    color: '#3b82f6',
    icon: 'Home',
    subcategories: [
      'Aluguel & Condomínio',
      'Energia, Água & Gás',
      'Internet & TV',
      'Manutenção da Casa',
    ],
  },
  {
    name: 'Transporte',
    kind: 'expense',
    color: '#6366f1',
    icon: 'Car',
    subcategories: ['Combustível', 'Uber & Táxi', 'Transporte Público', 'Seguro & IPVA'],
  },
  {
    name: 'Saúde & Bem-estar',
    kind: 'expense',
    color: '#ef4444',
    icon: 'HeartPulse',
    subcategories: ['Farmácia & Remédios', 'Consultas & Exames', 'Plano de Saúde', 'Academia'],
  },
  {
    name: 'Educação',
    kind: 'expense',
    color: '#8b5cf6',
    icon: 'GraduationCap',
    subcategories: ['Cursos & Certificações', 'Livros & Material', 'Mensalidade'],
  },
  {
    name: 'Lazer & Estilo',
    kind: 'expense',
    color: '#ec4899',
    icon: 'Gamepad2',
    subcategories: ['Streaming & Assinaturas', 'Viagens & Passeios', 'Cinema & Shows'],
  },
  {
    name: 'Compras Pessoais',
    kind: 'expense',
    color: '#10b981',
    icon: 'ShoppingBag',
    subcategories: ['Vestuário & Calçados', 'Eletrônicos & Gadgets', 'Cuidados Pessoais'],
  },
  {
    name: 'Serviços Financeiros',
    kind: 'expense',
    color: '#64748b',
    icon: 'Receipt',
    subcategories: ['Tarifas Bancárias', 'Juros & Encargos'],
  },
  // Receitas
  {
    name: 'Salário & Pró-labore',
    kind: 'income',
    color: '#10b981',
    icon: 'Briefcase',
    subcategories: ['Salário Mensal', '13º Salário', 'Adiantamento', 'Férias'],
  },
  {
    name: 'Rendimentos & Freelance',
    kind: 'income',
    color: '#06b6d4',
    icon: 'Laptop',
    subcategories: ['Projetos Extras', 'Consultorias', 'Comissões'],
  },
  {
    name: 'Investimentos',
    kind: 'income',
    color: '#84cc16',
    icon: 'TrendingUp',
    subcategories: ['Dividendos', 'Rendimentos FIIs', 'Juros Renda Fixa'],
  },
  {
    name: 'Outras Entradas',
    kind: 'income',
    color: '#eab308',
    icon: 'Coins',
    subcategories: ['Reembolsos', 'Presentes & Bonificações', 'Venda de Usados'],
  },
]

export async function seedDefaultCategories(): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    // Insere categoria pai
    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .insert({
        name: cat.name,
        kind: cat.kind,
        color: cat.color,
        icon: cat.icon,
        parent_id: null,
      })
      .select()
      .single()

    if (parentError) {
      // Se já existir (conflito de chave única), continua
      continue
    }

    // Insere subcategorias filhas vinculadas ao pai
    if (cat.subcategories.length > 0 && parent) {
      const childrenToInsert = cat.subcategories.map((subName) => ({
        name: subName,
        kind: cat.kind,
        color: cat.color,
        icon: cat.icon,
        parent_id: (parent as Category).id,
      }))

      await supabase.from('categories').insert(childrenToInsert)
    }
  }
}
