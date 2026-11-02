import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema, type ProjectFormData } from '@/lib/validations/project'
import { useProjects, type ProjectWithStats } from '@/hooks/use-projects'
import { categoryColors } from '@/lib/validations/category'
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

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectToEdit?: ProjectWithStats | null
}

export function ProjectDialog({
  open,
  onOpenChange,
  projectToEdit,
}: ProjectDialogProps) {
  const { createProject, updateProject } = useProjects()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!projectToEdit

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      target_budget: 0,
      start_date: null,
      end_date: null,
      status: 'in_progress',
      color: '#3b82f6',
      icon: 'FolderKanban',
    },
  })

  const selectedColor = useWatch({ control, name: 'color', defaultValue: '#3b82f6' })

  useEffect(() => {
    if (projectToEdit) {
      reset({
        name: projectToEdit.name,
        description: projectToEdit.description || '',
        target_budget: Number(projectToEdit.target_budget),
        start_date: projectToEdit.start_date,
        end_date: projectToEdit.end_date,
        status: projectToEdit.status,
        color: projectToEdit.color || '#3b82f6',
        icon: projectToEdit.icon || 'FolderKanban',
      })
    } else {
      reset({
        name: '',
        description: '',
        target_budget: 0,
        start_date: null,
        end_date: null,
        status: 'in_progress',
        color: '#3b82f6',
        icon: 'FolderKanban',
      })
    }
  }, [projectToEdit, reset, open])

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(data: ProjectFormData) {
    setServerError(null)
    try {
      if (isEditing && projectToEdit) {
        await updateProject({
          id: projectToEdit.id,
          data,
        })
      } else {
        await createProject(data)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar projeto'
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Projeto' : 'Novo Projeto Financeiro'}</DialogTitle>
          <DialogDescription>
            Planeje objetivos independentes (compra de carro, reforma, viagem, casamento).
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Nome do Projeto */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Nome do Projeto *</Label>
            <Input
              id="proj-name"
              placeholder="Ex.: Troca de Carro, Reforma da Cozinha, Viagem Europa"
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Descrição / Escopo (Opcional)</Label>
            <Input
              id="proj-desc"
              placeholder="Objetivos e detalhes do projeto..."
              disabled={isSubmitting}
              {...register('description')}
            />
          </div>

          {/* Orçamento Previsto */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-budget">Orçamento Estimado (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="proj-budget"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="pl-10 font-bold tabular"
                disabled={isSubmitting}
                {...register('target_budget', { valueAsNumber: true })}
              />
            </div>
            {errors.target_budget && (
              <p className="text-xs text-destructive">{errors.target_budget.message}</p>
            )}
          </div>

          {/* Datas de Início e Término */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start">Data de Início</Label>
              <Input
                id="proj-start"
                type="date"
                disabled={isSubmitting}
                {...register('start_date')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proj-end">Data Prevista de Término</Label>
              <Input
                id="proj-end"
                type="date"
                disabled={isSubmitting}
                {...register('end_date')}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-status">Status do Projeto</Label>
            <select
              id="proj-status"
              disabled={isSubmitting}
              {...register('status')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="planning">Em Planejamento</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluído</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>

          {/* Cor de Identificação */}
          <div className="space-y-1.5">
            <Label>Cor do Projeto</Label>
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
              {isEditing ? 'Salvar Alterações' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

