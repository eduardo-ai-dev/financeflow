import { useState, useMemo } from 'react'
import { useProjects, type ProjectWithStats } from '@/hooks/use-projects'
import { ProjectDialog } from '@/components/project-dialog'
import { EmptyState } from '@/components/empty-state'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FolderKanban,
  Plus,
  Target,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ProjetosPage() {
  const { projects, isLoading, deleteProject } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithStats | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('in_progress')

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects
    return projects.filter((p) => p.status === statusFilter)
  }, [projects, statusFilter])

  // KPIs
  const totalBudget = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.target_budget), 0),
    [projects]
  )

  const totalSpent = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.spent_amount), 0),
    [projects]
  )

  const totalRemaining = Math.max(0, totalBudget - totalSpent)

  function handleCreate() {
    setProjectToEdit(null)
    setDialogOpen(true)
  }

  function handleEdit(p: ProjectWithStats) {
    setProjectToEdit(p)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Projetos Financeiros
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Isole o planejamento de reformas, viagens, casamento ou compra de veículos sem misturar ao caixa do dia a dia.
          </p>
        </div>

        <Button onClick={handleCreate} size="sm" className="text-xs">
          <Plus className="size-4 mr-1.5" />
          Novo Projeto
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Orçamento Total */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Orçamento Total Planejado</span>
            <Target className="size-4 text-primary" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalBudget)}
          </div>
          <p className="text-[11px] text-muted-foreground">Soma das metas orçadas dos projetos</p>
        </div>

        {/* Total Já Gasto */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Total Executado (Gasto)</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalSpent)}
          </div>
          <p className="text-[11px] text-muted-foreground">Despesas vinculadas aos projetos</p>
        </div>

        {/* Saldo Orçamentário Restante */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Saldo Orçamentário Restante</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="tabular text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : formatBRL(totalRemaining)}
          </div>
          <p className="text-[11px] text-muted-foreground">Margem disponível para execução</p>
        </div>
      </div>

      {/* Filtros de Status */}
      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Em Andamento
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            statusFilter === 'completed'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Concluídos
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            statusFilter === 'all'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Todos ({projects.length})
        </button>
      </div>

      {/* Grid de Projetos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="Nenhum projeto encontrado"
          description="Cadastre seus grandes objetivos como reforma da casa, troca de carro ou viagem para controlar os gastos isoladamente."
          icon={FolderKanban}
          phase={4}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isCompleted = project.status === 'completed'

            return (
              <div
                key={project.id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-xs transition-all hover:shadow-md space-y-4"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: project.color || '#3b82f6' }}
                    >
                      <FolderKanban className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base tracking-tight text-foreground">
                          {project.name}
                        </h3>
                        {isCompleted && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                            Concluído
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Edit2 className="size-4 mr-2" />
                        Editar Projeto
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteProject(project.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Barra de Progresso do Orçamento */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Uso do orçamento:</span>
                    <span
                      className={`font-bold tabular ${
                        project.progress_percent > 100
                          ? 'text-rose-600 font-extrabold'
                          : 'text-foreground'
                      }`}
                    >
                      {project.progress_percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        project.progress_percent > 100
                          ? 'bg-rose-500'
                          : project.progress_percent >= 80
                          ? 'bg-amber-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, project.progress_percent)}%` }}
                    />
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground">Executado:</span>
                    <div className="tabular font-bold text-sm text-foreground mt-0.5">
                      {formatBRL(project.spent_amount)}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Orçamento Total:</span>
                    <div className="tabular font-bold text-sm text-foreground mt-0.5">
                      {formatBRL(project.target_budget)}
                    </div>
                  </div>
                </div>

                {/* Rodapé: Datas */}
                {(project.start_date || project.end_date) && (
                  <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {project.start_date ? formatDate(project.start_date) : 'Início'}
                    </span>
                    <span>
                      {project.end_date ? `Meta: ${formatDate(project.end_date)}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectToEdit={projectToEdit}
      />
    </div>
  )
}
export { ProjetosPage }
