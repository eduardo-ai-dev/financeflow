import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  BarChart3,
  CalendarDays,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  CreditCard,
  CalendarClock,
  Receipt,
  Repeat,
  ArrowRightLeft,
  FolderKanban,
  Home,
  Target,
  TrendingUp,
  Scale,
  BadgePercent,
  Vault,
  Sparkles,
  Calculator,
  FileSpreadsheet,
  Bell,
  Settings,
} from 'lucide-react'

export interface ModuleItem {
  id: string
  title: string
  path: string
  icon: LucideIcon
  description: string
  phase?: number
}

export interface ModuleGroup {
  id: string
  name: string
  items: ModuleItem[]
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'visao-geral',
    name: 'Visão Geral',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        description: 'Visão executiva consolidada da sua vida financeira e patrimonial.',
      },
      {
        id: 'resumo',
        title: 'Resumo Financeiro',
        path: '/resumo',
        icon: BarChart3,
        description: 'Análise detalhada do fluxo de caixa mensal (receitas vs. despesas).',
      },
      {
        id: 'calendario',
        title: 'Calendário Financeiro',
        path: '/calendario',
        icon: CalendarDays,
        description: 'Visão mensal de vencimentos de contas, faturas de cartão e recebimentos.',
      },
    ],
  },
  {
    id: 'fluxo-de-caixa',
    name: 'Fluxo de Caixa',
    items: [
      {
        id: 'contas',
        title: 'Contas',
        path: '/contas',
        icon: Landmark,
        description: 'Gestão de bancos, carteiras, dinheiro em espécie e liquidez imediata.',
      },
      {
        id: 'entradas',
        title: 'Entradas',
        path: '/entradas',
        icon: ArrowDownLeft,
        description: 'Controle de salários, rendimentos, bônus e contas a receber.',
      },
      {
        id: 'saidas',
        title: 'Saídas',
        path: '/saidas',
        icon: ArrowUpRight,
        description: 'Controle de despesas fixas, variáveis, eventuais e contas a pagar.',
      },
      {
        id: 'categorias',
        title: 'Categorias',
        path: '/categorias',
        icon: Tag,
        description: 'Organização de receitas e despesas por categorias e subcategorias.',
      },
      {
        id: 'cartoes',
        title: 'Cartões',
        path: '/cartoes',
        icon: CreditCard,
        description: 'Gestão de limites, faturas atuais/futuras e compras no crédito.',
      },
      {
        id: 'parcelamentos',
        title: 'Parcelamentos',
        path: '/parcelamentos',
        icon: CalendarClock,
        description: 'Central unificada de compromissos parcelados com ou sem cartão.',
      },
      {
        id: 'contas-a-pagar',
        title: 'Contas a Pagar/Receber',
        path: '/contas-a-pagar',
        icon: Receipt,
        description: 'Central consolidada de títulos e compromissos operacionais a liquidar.',
      },
      {
        id: 'recorrencias',
        title: 'Recorrências',
        path: '/recorrencias',
        icon: Repeat,
        description: 'Controle inteligente de assinaturas, planos mensais e contratos recorrentes.',
      },
      {
        id: 'transferencias',
        title: 'Transferências',
        path: '/transferencias',
        icon: ArrowRightLeft,
        description: 'Movimentações e liquidez entre contas bancárias, carteiras e cofres.',
      },
    ],
  },
  {
    id: 'patrimonio-e-objetivos',
    name: 'Patrimônio & Objetivos',
    items: [
      {
        id: 'projetos',
        title: 'Projetos',
        path: '/projetos',
        icon: FolderKanban,
        description: 'Gestão de grandes objetivos isolados (carro, reforma, viagens).',
      },
      {
        id: 'imoveis',
        title: 'Imóveis',
        path: '/imoveis',
        icon: Home,
        description: 'Módulo especializado para aquisição, evolução de obra e financiamento SAC/Price.',
      },
      {
        id: 'metas',
        title: 'Metas & Compras',
        path: '/metas',
        icon: Target,
        description: 'Lista de desejos (Wishlist), reservas carimbadas e conversão patrimonial.',
      },
      {
        id: 'investimentos',
        title: 'Investimentos',
        path: '/investimentos',
        icon: TrendingUp,
        description: 'Carteira de ativos, rentabilidade, dividendos e metas de aporte.',
      },
      {
        id: 'patrimonio',
        title: 'Patrimônio',
        path: '/patrimonio',
        icon: Scale,
        description: 'Balanço patrimonial completo (Ativos vs. Passivos = Patrimônio Líquido).',
      },
      {
        id: 'dividas',
        title: 'Dívidas & Financiamentos',
        path: '/dividas',
        icon: BadgePercent,
        description: 'Controle de passivos onerosos, empréstimos, taxas e cronogramas de amortização.',
      },
      {
        id: 'cofres',
        title: 'Reservas & Cofres',
        path: '/cofres',
        icon: Vault,
        description: 'Cofres blindados, reserva de emergência e alocações carimbadas com meta.',
      },
    ],
  },
  {
    id: 'estrategia-e-analise',
    name: 'Estratégia & Análise',
    items: [
      {
        id: 'planejamento',
        title: 'Planejamento Futuro',
        path: '/planejamento',
        icon: Sparkles,
        description: 'Simulador estratégico de cenários (Conservador, Realista, Otimista) e projeções.',
      },
      {
        id: 'simuladores',
        title: 'Simuladores',
        path: '/simuladores',
        icon: Calculator,
        description: 'Simulações de juros compostos, amortização antecipada e independência financeira.',
      },
      {
        id: 'relatorios',
        title: 'Relatórios',
        path: '/relatorios',
        icon: FileSpreadsheet,
        description: 'Indicadores avançados, DRE pessoal consolidado e exportação de relatórios.',
      },
      {
        id: 'notificacoes',
        title: 'Notificações',
        path: '/notificacoes',
        icon: Bell,
        description: 'Central de avisos, alertas de vencimento e alertas patrimoniais.',
      },
    ],
  },
  {
    id: 'sistema',
    name: 'Sistema',
    items: [
      {
        id: 'configuracoes',
        title: 'Configurações',
        path: '/configuracoes',
        icon: Settings,
        description: 'Preferências visuais, portabilidade de dados e perfil de acesso.',
      },
    ],
  },
]

export const ALL_MODULES = MODULE_GROUPS.flatMap((group) => group.items)

export function getModuleByPath(path: string): ModuleItem | undefined {
  if (path === '/') {
    return ALL_MODULES.find((m) => m.path === '/')
  }
  return ALL_MODULES.find((m) => m.path !== '/' && (path === m.path || path.startsWith(`${m.path}/`)))
}
