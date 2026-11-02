import { useState } from 'react'
import { useGoals, type GoalWithStats } from '@/hooks/use-goals'
import { formatCurrency } from '@/lib/money'
import { GoalDialog } from '@/components/goal-dialog'
import { GoalContributeDialog } from '@/components/goal-contribute-dialog'
import { GoalConvertDialog } from '@/components/goal-convert-dialog'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'

type TabType = 'active' | 'wishlist' | 'completed'

export default function MetasPage() {
  const { goals, isLoading, deleteGoal } = useGoals()
  const [activeTab, setActiveTab] = useState<TabType>('active')

  // Modais
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithStats | null>(null)
  const [contributeGoal, setContributeGoal] = useState<GoalWithStats | null>(null)
  const [convertGoal, setConvertGoal] = useState<GoalWithStats | null>(null)
  const [defaultNewStatus, setDefaultNewStatus] = useState<'planned' | 'in_progress'>('in_progress')

  const activeGoals = goals.filter((g) => g.status === 'in_progress')
  const wishlistGoals = goals.filter((g) => g.status === 'planned')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  // Métricas agregadas
  const totalTargetActive = activeGoals.reduce((acc, g) => acc + g.target_amount, 0)
  const totalSavedActive = activeGoals.reduce((acc, g) => acc + g.current_amount, 0)
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

  async function handleDelete(goal: GoalWithStats) {
    if (confirm(`Tem certeza que deseja remover a meta "${goal.name}"?`)) {
      await deleteGoal(goal.id)
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case 'essential':
        return (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Essencial
          </span>
        )
      case 'high':
        return (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Alta
          </span>
        )
      case 'medium':
        return (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            Média
          </span>
        )
      default:
        return (
          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            Desejo
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas & Wishlist de Compras</h1>
          <p className="text-sm text-muted-foreground">
            Planeje objetivos de curto e longo prazo, acompanhe a poupança e converta compras em patrimônio real.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNewGoal('planned')} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            + Wishlist
          </Button>
          <Button onClick={() => openNewGoal('in_progress')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* Métricas do Módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Metas em Poupança</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(totalTargetActive)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} em andamento
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Já Guardado</span>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalSavedActive)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalTargetActive > 0
              ? `${Math.round((totalSavedActive / totalTargetActive) * 100)}% do objetivo alcançado`
              : '0% do objetivo alcançado'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Lista de Desejos (Wishlist)</span>
            <Bookmark className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalWishlist)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {wishlistGoals.length} ite{wishlistGoals.length !== 1 ? 'ns' : 'm'} aguardando priorização
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Objetivos Conquistados</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">{completedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Bens adquiridos e incorporados
          </p>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="h-4 w-4" />
          Metas Ativas ({activeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'wishlist'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Wishlist & Desejos ({wishlistGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Concluídas & Patrimônio ({completedGoals.length})
        </button>
      </div>

      {/* Lista de Metas / Wishlist */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Carregando objetivos e metas...
        </div>
      ) : activeTab === 'active' && activeGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
          <Target className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h3 className="font-semibold text-lg">Nenhuma meta ativa no momento</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Crie objetivos de médio e longo prazo (viagens, fundos de reserva ou bens) e acompanhe seu progresso de poupança.
          </p>
          <Button onClick={() => openNewGoal('in_progress')} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Criar Primeira Meta
          </Button>
        </div>
      ) : activeTab === 'wishlist' && wishlistGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h3 className="font-semibold text-lg">Sua Wishlist está vazia</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Cadastre os itens que você quer comprar no futuro para evitar compras por impulso e planejar o melhor momento de compra.
          </p>
          <Button onClick={() => openNewGoal('planned')} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Adicionar Desejo à Wishlist
          </Button>
        </div>
      ) : activeTab === 'completed' && completedGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h3 className="font-semibold text-lg">Nenhuma meta concluída ainda</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Assim que você concluir uma meta e adquirir o bem, ele aparecerá aqui e poderá ser incorporado ao seu Balanço Patrimonial.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'active'
            ? activeGoals
            : activeTab === 'wishlist'
            ? wishlistGoals
            : completedGoals
          ).map((goal) => (
            <div
              key={goal.id}
              className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base leading-snug">{goal.name}</h3>
                    </div>
                    {goal.brand && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Marca/Ref: {goal.brand}
                      </p>
                    )}
                  </div>
                  {getPriorityBadge(goal.priority)}
                </div>

                {goal.image_url && (
                  <div className="mt-3 overflow-hidden rounded-lg border bg-muted/20 h-32 flex items-center justify-center">
                    <img
                      src={goal.image_url}
                      alt={goal.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Bloco de Valores */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Alvo:</span>
                    <span className="font-bold">{formatCurrency(goal.target_amount)}</span>
                  </div>

                  {activeTab !== 'wishlist' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Guardado:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(goal.current_amount)}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-1">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              goal.progress_percent >= 100 ? 'bg-emerald-500' : 'bg-primary'
                            }`}
                            style={{ width: `${goal.progress_percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{goal.progress_percent}% acumulado</span>
                          <span>Falta {formatCurrency(goal.remaining_amount)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {goal.target_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Data Prevista: {new Date(goal.target_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}

                  {goal.converted_to_asset && goal.asset && (
                    <div className="mt-2 rounded-md bg-primary/10 p-2 text-xs text-primary flex items-center gap-2">
                      <Layers className="h-4 w-4 shrink-0" />
                      <span>Ativo registrado no Patrimônio</span>
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2 mt-2">
                      &ldquo;{goal.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEdit(goal)}
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(goal)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {goal.status === 'planned' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => handleEdit({ ...goal, status: 'in_progress' })}
                    >
                      <Target className="h-3.5 w-3.5" />
                      Ativar Meta
                    </Button>
                  )}

                  {goal.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => setContributeGoal(goal)}
                      >
                        <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
                        Aportar
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setConvertGoal(goal)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Comprar & Ativar
                      </Button>
                    </>
                  )}

                  {goal.status === 'completed' && !goal.converted_to_asset && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => setConvertGoal(goal)}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Incorporar ao Patrimônio
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
        open={!!convertGoal}
        onOpenChange={(open) => !open && setConvertGoal(null)}
        goal={convertGoal}
      />
    </div>
  )
}
