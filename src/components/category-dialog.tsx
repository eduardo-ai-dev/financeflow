import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  categorySchema,
  categoryColors,
  categoryIcons,
  type CategoryFormData,
} from '@/lib/validations/category'
import { useCategories } from '@/hooks/use-categories'
import type { Category } from '@/types/database'
import { ICON_MAP } from '@/lib/icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryToEdit?: Category | null
  initialKind?: 'income' | 'expense'
  initialParentId?: string | null
}

export function CategoryDialog({
  open,
  onOpenChange,
  categoryToEdit,
  initialKind = 'expense',
  initialParentId = null,
}: CategoryDialogProps) {
  const { categories, createCategory, updateCategory } = useCategories()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!categoryToEdit

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      kind: initialKind,
      parent_id: initialParentId,
      color: '#10b981',
      icon: 'Tag',
    },
  })

  const selectedColor = useWatch({ control, name: 'color', defaultValue: '#10b981' })
  const selectedIcon = useWatch({ control, name: 'icon', defaultValue: 'Tag' })
  const selectedKind = useWatch({ control, name: 'kind', defaultValue: initialKind })
  const selectedParentId = useWatch({ control, name: 'parent_id', defaultValue: initialParentId })

  // Candidatos a categoria-pai: mesma natureza (income/expense), sem parent_id (apenas pais de 1º nível) e não pode ser a própria categoria em edição
  const parentCandidates = categories.filter(
    (c) =>
      c.kind === selectedKind &&
      !c.parent_id &&
      !c.is_archived &&
      (!categoryToEdit || c.id !== categoryToEdit.id)
  )

  useEffect(() => {
    if (categoryToEdit) {
      reset({
        name: categoryToEdit.name,
        kind: categoryToEdit.kind,
        parent_id: categoryToEdit.parent_id,
        color: categoryToEdit.color || '#10b981',
        icon: categoryToEdit.icon || 'Tag',
      })
    } else {
      reset({
        name: '',
        kind: initialKind,
        parent_id: initialParentId,
        color: initialKind === 'income' ? '#10b981' : '#f59e0b',
        icon: 'Tag',
      })
    }
  }, [categoryToEdit, initialKind, initialParentId, reset, open])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: CategoryFormData) {
    setServerError(null)
    try {
      if (isEditing && categoryToEdit) {
        await updateCategory({
          id: categoryToEdit.id,
          data: {
            name: data.name,
            color: data.color,
            icon: data.icon,
            parent_id: data.parent_id || null,
          },
        })
      } else {
        await createCategory(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar categoria'
      if (msg.includes('categories_user_kind_parent_name_key')) {
        setServerError('Já existe uma categoria com este nome neste nível.')
      } else {
        setServerError(msg)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite o nome, ícone ou hierarquia da categoria.'
              : 'Cadastre categorias e subcategorias para classificar seu fluxo de caixa.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Tipo (Receita vs Despesa) - desabilitado se estiver editando */}
          <div className="space-y-1.5">
            <Label>Tipo de Categoria</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selectedKind === 'expense' ? 'default' : 'outline'}
                disabled={isEditing || isSubmitting}
                className={
                  selectedKind === 'expense'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white font-medium'
                    : 'text-muted-foreground'
                }
                onClick={() => {
                  setValue('kind', 'expense')
                  setValue('parent_id', null)
                  setValue('color', '#f59e0b')
                }}
              >
                Despesa
              </Button>
              <Button
                type="button"
                variant={selectedKind === 'income' ? 'default' : 'outline'}
                disabled={isEditing || isSubmitting}
                className={
                  selectedKind === 'income'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-medium'
                    : 'text-muted-foreground'
                }
                onClick={() => {
                  setValue('kind', 'income')
                  setValue('parent_id', null)
                  setValue('color', '#10b981')
                }}
              >
                Receita
              </Button>
            </div>
          </div>

          {/* Categoria Pai (Opcional - para subcategoria) */}
          <div className="space-y-1.5">
            <Label htmlFor="category-parent">Categoria Pai (Opcional)</Label>
            <select
              id="category-parent"
              disabled={isSubmitting}
              value={selectedParentId || ''}
              onChange={(e) => setValue('parent_id', e.target.value ? e.target.value : null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Nenhuma (Categoria Principal)</option>
              {parentCandidates.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nome da Categoria */}
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nome da Categoria *</Label>
            <Input
              id="category-name"
              placeholder="Ex.: Alimentação, Moradia, Salário..."
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Seletor de Cores */}
          <div className="space-y-1.5">
            <Label>Cor de Destaque</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {categoryColors.map((color) => {
                const isSelected = selectedColor.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setValue('color', color)}
                    style={{ backgroundColor: color }}
                    className={`size-6 rounded-full transition-transform hover:scale-110 focus:outline-hidden ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                    }`}
                    aria-label={`Selecionar cor ${color}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Seletor de Ícones */}
          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1 border rounded-lg">
              {categoryIcons.map((iconKey) => {
                const IconComponent = ICON_MAP[iconKey] || ICON_MAP.Tag
                const isSelected = selectedIcon === iconKey
                return (
                  <button
                    key={iconKey}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setValue('icon', iconKey)}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-colors hover:bg-muted ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground'
                    }`}
                    title={iconKey}
                  >
                    <IconComponent className="size-4" />
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
