import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjects,
  createProject as createProjectService,
  updateProject as updateProjectService,
  deleteProject as deleteProjectService,
  type ProjectWithStats,
} from '@/services/projects'
import type { ProjectFormData } from '@/lib/validations/project'

export function useProjects() {
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => createProjectService(data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectFormData> }) =>
      updateProjectService(id, data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectService(id),
    onSuccess: () => {
      invalidateAll()
    },
  })

  return {
    projects,
    isLoading,
    error,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateProject: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProject: deleteMutation.mutateAsync,
  }
}

export type { ProjectWithStats }

