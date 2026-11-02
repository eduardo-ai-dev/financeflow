import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  BarChart3,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  CreditCard,
  CalendarClock,
  FolderKanban,
  Home,
  Target,
  TrendingUp,
  Scale,
  Sparkles,
  FileSpreadsheet,
  Settings,
} from 'lucide-react'

export interface ModuleItem {
  id: string
  title: string
  path: string
  icon: LucideIcon
  description: string
  phase: number
}

export interface ModuleGroup {
  name: string
  items: ModuleItem[]
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    name: 'Visão Geral',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        description: 'Visão executiva consolidada da sua vida financeira e patrimonial.',
        phase: 1,
      },
      {
        id: 'resumo',
        title: 'Resumo Financeiro',
        path: '/resumo',
        icon: BarChart3,
        description: 'Análise detalhada do fluxo de caixa mensal (receitas vs. despesas).',
        phase: 2,
      },
    ],
  },
  {
    name: 'Fluxo de Caixa',
    items: [
      {
        id: 'contas',
        title: 'Contas',
        path: '/contas',
        icon: Landmark,
        description: 'Gestão de bancos, carteiras, dinheiro em espécie e liquidez imediata.',
        phase: 2,
      },
      {
        id: 'entradas',
        title: 'Entradas',
        path: '/entradas',
        icon: ArrowDownLeft,
        description: 'Controle de salários, rendimentos, bônus e contas a receber.',
        phase: 2,
      },
      {
        id: 'saidas',
        title: 'Saídas',
        path: '/saidas',
        icon: ArrowUpRight,
        description: 'Controle de despesas fixas, variáveis, eventuais e contas a pagar.',
        phase: 2,
      },
      {
        id: 'categorias',
        title: 'Categorias',
        path: '/categorias',
        icon: Tag,
        description: 'Organização de receitas e despesas por categorias e subcategorias.',
        phase: 2,
      },
      {
        id: 'cartoes',
        title: 'Cartões',
        path: '/cartoes',
        icon: CreditCard,
        description: 'Gestão de limites, faturas atuais/futuras e compras no crédito.',
        phase: 3,
      },
      {
        id: 'parcelamentos',
        title: 'Parcelamentos',
        path: '/parcelamentos',
        icon: CalendarClock,
        description: 'Central unificada de compromissos parcelados com ou sem cartão.',
        phase: 3,
      },
    ],
  },
  {
    name: 'Patrimônio & Objetivos',
    items: [
      {
        id: 'projetos',
        title: 'Projetos',
        path: '/projetos',
        icon: FolderKanban,
        description: 'Gestão de grandes objetivos isolados (carro, reforma, viagens).',
        phase: 4,
      },
      {
        id: 'imoveis',
        title: 'Imóveis',
        path: '/imoveis',
        icon: Home,
        description: 'Módulo especializado para aquisição, evolução de obra e financiamento SAC/Price.',
        phase: 4,
      },
      {
        id: 'metas',
        title: 'Metas & Compras',
        path: '/metas',
        icon: Target,
        description: 'Lista de desejos (Wishlist), reservas carimbadas e conversão patrimonial.',
        phase: 5,
      },
      {
        id: 'investimentos',
        title: 'Investimentos',
        path: '/investimentos',
        icon: TrendingUp,
        description: 'Carteira de ativos, rentabilidade, dividendos e metas de aporte.',
        phase: 6,
      },
      {
        id: 'patrimonio',
        title: 'Patrimônio',
        path: '/patrimonio',
        icon: Scale,
        description: 'Balanço patrimonial completo (Ativos vs. Passivos = Patrimônio Líquido).',
        phase: 6,
      },
    ],
  },
  {
    name: 'Estratégia & Análise',
    items: [
      {
        id: 'planejamento',
        title: 'Planejamento Futuro',
        path: '/planejamento',
        icon: Sparkles,
        description: 'Simulador estratégico de cenários (Conservador, Realista, Otimista) e projeções.',
        phase: 7,
      },
      {
        id: 'relatorios',
        title: 'Relatórios',
        path: '/relatorios',
        icon: FileSpreadsheet,
        description: 'Indicadores avançados, comparativos temporais e exportação de relatórios.',
        phase: 8,
      },
    ],
  },
  {
    name: 'Sistema',
    items: [
      {
        id: 'configuracoes',
        title: 'Configurações',
        path: '/configuracoes',
        icon: Settings,
        description: 'Categorias, campos customizados, alertas, importação/exportação e perfil.',
        phase: 8,
      },
    ],
  },
]

export const ALL_MODULES = MODULE_GROUPS.flatMap((group) => group.items)

export function getModuleByPath(path: string): ModuleItem | undefined {
  if (path === '/') {
    return ALL_MODULES.find((m) => m.path === '/')
  }
  return ALL_MODULES.find((m) => m.path !== '/' && path.startsWith(m.path))
}

