import { useState } from 'react'
import { useGoals, type GoalWithStats } from '@/hooks/use-goals'
import { formatCurrency } from '@/lib/money'
import { formatDate } from '@/lib/date'
import { GoalDialog } from '@/components/goal-dialog'
import { GoalContributeDialog } from '@/components/goal-contribute-dialog'
import { GoalConvertDialog } from '@/components/goal-convert-dialog'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Target,
  Plus,
  PiggyBank,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ShoppingBag,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react'

type TabType = 'active' | 'wishlist' | 'completed'

export default function MetasPage() {
  const { goals, isLoading, deleteGoal } = useGoals()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Modais
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithStats | null>(null)
  const [contributeGoal, setContributeGoal] = useState<GoalWithStats | null>(null)
  const [convertGoal, setConvertGoal] = useState<GoalWithStats | null>(null)
  const [defaultNewStatus, setDefaultNewStatus] = useState<'planned' | 'in_progress'>(
    'in_progress'
  )

  const activeGoals = goals.filter((g) => g.status === 'in_progress')
  const wishlistGoals = goals.filter((g) => g.status === 'planned')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  // Métricas agregadas
  const totalTargetActive = activeGoals.reduce((acc, g) => acc + g.target_amount, 0)
  const totalSavedActive = activeGoals.reduce((acc, g) => acc + g.current_amount, 0)
  const overallProgressPercent =
    totalTargetActive > 0
      ? Math.min(100, Math.round((totalSavedActive / totalTargetActive) * 100))
      : 0
  const totalWishlist = wishlistGoals.reduce((acc, g) => acc + g.target_amount, 0)
  const completedCount = completedGoals.length

  function openNewGoal(status: 'planned' | 'in_progress' = 'in_progress') {
    setEditingGoal(null)
    setDefaultNewStatus(status)
    setGoalDialogOpen(true)
  }

  function handleEdit(goal: GoalWithStats) {
    setEditingGoal(goal)
    setGoalDialogOpen(true)
  }

  async function handleConfirmDelete(id: string) {
    await deleteGoal(id)
    setConfirmDeleteId(null)
  }

  function renderPriorityBadge(priority: string) {
    switch (priority) {
      case 'essential':
        return <Badge variant="destructive">Essencial</Badge>
      case 'high':
        return <Badge variant="warning">Alta</Badge>
      case 'medium':
        return <Badge variant="default">Média</Badge>
      default:
        return <Badge variant="secondary">Desejo</Badge>
    }
  }

  function renderGoalCard(goal: GoalWithStats, mode: TabType) {
    const isComplete = goal.progress_percent >= 100 || goal.status === 'completed'

    return (
      <Card
        key={goal.id}
        className="justify-between overflow-hidden transition-colors hover:border-primary/40 py-0 gap-0"
      >
        <div>
          {goal.image_url && /^https?:\/\//i.test(goal.image_url) && (
            <div className="h-36 w-full overflow-hidden border-b bg-muted/30">
              <img
                src={goal.image_url}
                alt={goal.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <CardHeader className="pt-5 pb-3">
            <CardTitle className="text-base line-clamp-1">{goal.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              {goal.brand ? <span>{goal.brand}</span> : <span>Objetivo pessoal</span>}
              {goal.target_date && (
                <>
                  <span>&middot;</span>
                  <span className="inline-flex items-center gap-1 tabular">
                    <Calendar className="size-3" />
                    {formatDate(goal.target_date)}
                  </span>
                </>
              )}
            </CardDescription>
            <CardAction>{renderPriorityBadge(goal.priority)}</CardAction>
          </CardHeader>

          <CardContent className="space-y-4 pb-5">
            {mode === 'wishlist' ? (
              <div className="rounded-xl border bg-muted/20 p-3.5 flex items-center justify-between tabular">
                <span className="text-xs text-muted-foreground">Valor estimado</span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(goal.target_amount)}
                </span>
              </div>
            ) : (
              <div className="space-y-3 tabular">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Guardado
                    </p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(goal.current_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Objetivo
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Progress
                    value={goal.progress_percent}
                    indicatorClassName={isComplete ? 'bg-emerald-500' : 'bg-primary'}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {goal.progress_percent}% concluído
                    </span>
                    <span className="text-muted-foreground">
                      {goal.remaining_amount > 0
                        ? `Faltam ${formatCurrency(goal.remaining_amount)}`
                        : 'Valor atingido'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {goal.converted_to_asset && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                <Layers className="size-3.5 shrink-0" />
                <span>Incorporado ao Balanço Patrimonial</span>
              </div>
            )}

            {goal.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {goal.notes}
              </p>
            )}
          </CardContent>
        </div>

        <CardFooter className="border-t bg-muted/15 py-3 justify-between gap-2">
          {confirmDeleteId === goal.id ? (
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="text-xs text-destructive font-medium">Excluir esta meta?</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => handleConfirmDelete(goal.id)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-0.5">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleEdit(goal)}
                  title="Editar meta"
                  aria-label="Editar meta"
                >
                  <Edit2 className="size-3.5" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDeleteId(goal.id)}
                  title="Excluir meta"
                  aria-label="Excluir meta"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {goal.status === 'planned' && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleEdit({ ...goal, status: 'in_progress' })}
                  >
                    <ArrowUpRight className="size-3.5 text-primary" />
                    Iniciar Poupança
                  </Button>
                )}

                {goal.status === 'in_progress' && (
                  <>
                    <Button
                      size="xs"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setContributeGoal(goal)}
                    >
                      <PiggyBank className="size-3.5 text-emerald-500" />
                      Aportar
                    </Button>
                    <Button
                      size="xs"
                      className="gap-1"
                      onClick={() => setConvertGoal(goal)}
                    >
                      <Sparkles className="size-3.5" />
                      Concluir
                    </Button>
                  </>
                )}

                {goal.status === 'completed' && !goal.converted_to_asset && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setConvertGoal(goal)}
                  >
                    <Layers className="size-3.5" />
                    Criar Patrimônio
                  </Button>
                )}
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Metas & Wishlist
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize objetivos financeiros, acompanhe seus aportes e transforme conquistas em patrimônio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNewGoal('planned')}
            className="gap-1.5 text-xs"
          >
            <ShoppingBag className="size-4" />
            + Wishlist
          </Button>
          <Button
            size="sm"
            onClick={() => openNewGoal('in_progress')}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-4" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* KPIs de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="py-4 gap-3">
          <CardHeader className="pb-0">
            <CardDescription className="uppercase tracking-wider font-semibold text-[11px]">
              Total das Metas Ativas
            </CardDescription>
            <CardAction>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="size-4" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="tabular text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalTargetActive)}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 gap-3">
          <CardHeader className="pb-0">
            <CardDescription className="uppercase tracking-wider font-semibold text-[11px]">
              Total Já Guardado
            </CardDescription>
            <CardAction>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <PiggyBank className="size-4" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalSavedActive)}
            </div>
            <Progress value={overallProgressPercent} className="h-1.5" />
            <p className="text-xs text-muted-foreground tabular">
              {overallProgressPercent}% do objetivo acumulado
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 gap-3">
          <CardHeader className="pb-0">
            <CardDescription className="uppercase tracking-wider font-semibold text-[11px]">
              Wishlist Planejada
            </CardDescription>
            <CardAction>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Bookmark className="size-4" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="tabular text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalWishlist)}
            </div>
            <p className="text-xs text-muted-foreground">
              {wishlistGoals.length} ite{wishlistGoals.length !== 1 ? 'ns' : 'm'} aguardando início
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 gap-3">
          <CardHeader className="pb-0">
            <CardDescription className="uppercase tracking-wider font-semibold text-[11px]">
              Metas Conquistadas
            </CardDescription>
            <CardAction>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <CheckCircle2 className="size-4" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="tabular text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : completedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivos concluídos com sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas com shadcn/ui Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabType)}
        className="space-y-5"
      >
        <TabsList className="h-10 p-1 w-full sm:w-fit overflow-x-auto">
          <TabsTrigger value="active" className="px-3.5 gap-2">
            <Target className="size-4" />
            <span>Em Andamento</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {activeGoals.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="px-3.5 gap-2">
            <ShoppingBag className="size-4" />
            <span>Wishlist</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {wishlistGoals.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="px-3.5 gap-2">
            <Sparkles className="size-4" />
            <span>Conquistadas</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {completedGoals.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="active">
              {activeGoals.length === 0 ? (
                <Card className="border-dashed bg-card/50 py-12 items-center text-center">
                  <CardContent className="flex flex-col items-center max-w-md space-y-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Target className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">Nenhuma meta ativa no momento</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Defina objetivos de curto, médio ou longo prazo e acompanhe cada aporte até a conquista.
                      </p>
                    </div>
                    <Button
                      onClick={() => openNewGoal('in_progress')}
                      size="sm"
                      className="mt-1 gap-1.5 text-xs"
                    >
                      <Plus className="size-4" /> Criar Primeira Meta
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeGoals.map((goal) => renderGoalCard(goal, 'active'))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wishlist">
              {wishlistGoals.length === 0 ? (
                <Card className="border-dashed bg-card/50 py-12 items-center text-center">
                  <CardContent className="flex flex-col items-center max-w-md space-y-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                      <ShoppingBag className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">Sua Wishlist está vazia</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Registre desejos de compra futuros para avaliar prioridades com calma e evitar compras por impulso.
                      </p>
                    </div>
                    <Button
                      onClick={() => openNewGoal('planned')}
                      variant="outline"
                      size="sm"
                      className="mt-1 gap-1.5 text-xs"
                    >
                      <Plus className="size-4" /> Adicionar à Wishlist
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {wishlistGoals.map((goal) => renderGoalCard(goal, 'wishlist'))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedGoals.length === 0 ? (
                <Card className="border-dashed bg-card/50 py-12 items-center text-center">
                  <CardContent className="flex flex-col items-center max-w-md space-y-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">Nenhuma meta concluída ainda</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Quando você concluir uma meta, ela ficará registrada aqui e poderá ser adicionada ao seu patrimônio.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completedGoals.map((goal) => renderGoalCard(goal, 'completed'))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modais */}
      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goalToEdit={editingGoal}
        defaultStatus={defaultNewStatus}
      />

      <GoalContributeDialog
        open={!!contributeGoal}
        onOpenChange={(open) => !open && setContributeGoal(null)}
        goal={contributeGoal}
      />

      <GoalConvertDialog
        key={convertGoal?.id || 'convert'}
        open={!!convertGoal}
        onOpenChange={(open) => !open && setConvertGoal(null)}
        goal={convertGoal}
      />
    </div>
  )
}
