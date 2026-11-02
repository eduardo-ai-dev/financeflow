import { useState, useMemo } from 'react'
import { useCategories, type CategoryWithChildren } from '@/hooks/use-categories'
import { CategoryDialog } from '@/components/category-dialog'
import { EmptyState } from '@/components/empty-state'
import { getCategoryIcon } from '@/lib/icons'
import type { Category } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  Sparkles,
  Archive,
  ArchiveRestore,
  Edit2,
  MoreVertical,
  ChevronRight,
  FolderTree,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function CategoriasPage() {
  const {
    categories,
    isLoading,
    categoryTree,
    archiveCategory,
    unarchiveCategory,
    seedDefaultCategories,
    isSeeding,
  } = useCategories()

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [initialParentId, setInitialParentId] = useState<string | null>(null)

  const rawTree = useMemo(() => categoryTree(activeTab), [categoryTree, activeTab])

  // Filtra por busca e status de arquivamento
  const filteredTree = useMemo(() => {
    return rawTree
      .filter((parent) => (showArchived ? true : !parent.is_archived))
      .map((parent) => {
        const matchesParent = parent.name.toLowerCase().includes(search.toLowerCase())
        const filteredChildren = (parent.children || []).filter(
          (child) =>
            (showArchived ? true : !child.is_archived) &&
            (matchesParent || child.name.toLowerCase().includes(search.toLowerCase()))
        )

        return {
          ...parent,
          children: filteredChildren,
          isMatch: matchesParent || filteredChildren.length > 0,
        }
      })
      .filter((parent) => parent.isMatch)
  }, [rawTree, search, showArchived])

  function handleCreateParent() {
    setCategoryToEdit(null)
    setInitialParentId(null)
    setDialogOpen(true)
  }

  function handleCreateSub(parentId: string) {
    setCategoryToEdit(null)
    setInitialParentId(parentId)
    setDialogOpen(true)
  }

  function handleEdit(cat: Category) {
    setCategoryToEdit(cat)
    setInitialParentId(cat.parent_id)
    setDialogOpen(true)
  }

  const isEmpty = categories.length === 0

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Categorias Financeiras
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize suas receitas e despesas com hierarquia de categorias e subcategorias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {categories.some((c) => c.is_archived) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs"
            >
              <Archive className="size-3.5 mr-1.5" />
              {showArchived ? 'Ocultar Arquivadas' : 'Ver Arquivadas'}
            </Button>
          )}

          <Button onClick={handleCreateParent} size="sm" className="text-xs">
            <Plus className="size-4 mr-1.5" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Banner de Seed se a conta não tiver nenhuma categoria */}
      {!isLoading && isEmpty && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-semibold text-base">
              <Sparkles className="size-5" />
              <span>Comece rapidamente com a estrutura recomendada</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Podemos inicializar para você as principais categorias brasileiras de despesas
              (Alimentação, Moradia, Transporte, Saúde...) e receitas (Salário, Rendimentos, Investimentos...)
              com ícones e cores configuradas.
            </p>
          </div>
          <Button
            onClick={() => seedDefaultCategories()}
            disabled={isSeeding}
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
          >
            <Sparkles className="size-4 mr-1.5" />
            {isSeeding ? 'Inicializando...' : 'Inicializar Categorias Padrão'}
          </Button>
        </div>
      )}

      {/* Navegação de Abas (Despesas / Receitas) e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'expense'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Despesas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'income'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Receitas
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar categorias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Árvore de Categorias */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      ) : filteredTree.length === 0 ? (
        <EmptyState
          title={`Nenhuma categoria de ${activeTab === 'expense' ? 'despesa' : 'receita'} encontrada`}
          description={
            search
              ? 'Tente buscar com outro termo ou limpe o campo de busca.'
              : 'Clique em "Nova Categoria" para cadastrar a primeira ou utilize o botão de recomendação.'
          }
          icon={FolderTree}
          phase={2}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredTree.map((parent: CategoryWithChildren) => {
            const ParentIcon = getCategoryIcon(parent.icon)
            const children = parent.children || []

            return (
              <div
                key={parent.id}
                className={`group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md ${
                  parent.is_archived ? 'opacity-60 bg-muted/20' : ''
                }`}
              >
                {/* Header da Categoria Pai */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: parent.color || '#10b981' }}
                    >
                      <ParentIcon className="size-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base tracking-tight text-foreground">
                          {parent.name}
                        </h3>
                        {parent.is_archived && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                            Arquivada
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {children.length} {children.length === 1 ? 'subcategoria' : 'subcategorias'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCreateSub(parent.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-3.5 mr-1" />
                      Sub
                    </Button>

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
                        <DropdownMenuItem onClick={() => handleEdit(parent)}>
                          <Edit2 className="size-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {parent.is_archived ? (
                          <DropdownMenuItem onClick={() => unarchiveCategory(parent.id)}>
                            <ArchiveRestore className="size-4 mr-2" />
                            Desarquivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => archiveCategory(parent.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Archive className="size-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Subcategorias */}
                {children.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pt-3">
                    Nenhuma subcategoria vinculada.
                  </p>
                ) : (
                  <ul className="pt-3 space-y-1.5">
                    {children.map((child) => {
                      const SubIcon = getCategoryIcon(child.icon)
                      return (
                        <li
                          key={child.id}
                          className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors group/sub"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight className="size-3.5 text-muted-foreground/60" />
                            <SubIcon className="size-3.5 text-muted-foreground" />
                            <span
                              className={`text-xs ${
                                child.is_archived
                                  ? 'text-muted-foreground line-through'
                                  : 'text-foreground'
                              }`}
                            >
                              {child.name}
                            </span>
                          </div>

                          <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleEdit(child)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Editar subcategoria"
                            >
                              <Edit2 className="size-3" />
                            </button>
                            {child.is_archived ? (
                              <button
                                type="button"
                                onClick={() => unarchiveCategory(child.id)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Desarquivar subcategoria"
                              >
                                <ArchiveRestore className="size-3" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => archiveCategory(child.id)}
                                className="p-1 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Arquivar subcategoria"
                              >
                                <Archive className="size-3" />
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoryToEdit={categoryToEdit}
        initialKind={activeTab}
        initialParentId={initialParentId}
      />
    </div>
  )
}
export { CategoriasPage }
