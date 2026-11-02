import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCategories,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  toggleArchiveCategory,
  deleteCategory as deleteCategoryService,
  seedDefaultCategories,
  type CategoryWithChildren,
} from '@/services/categories'
import { useAuth } from '@/hooks/use-auth'
import type { CategoryFormData } from '@/lib/validations/category'
import type { Category } from '@/types/database'

export function useCategories() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: fetchCategories,
    enabled: !!user?.id,
  })

  // Organiza categorias em árvore (pais com lista de filhas) com referência estável
  const categoryTree = useCallback(
    (kind?: 'income' | 'expense') => {
      const filtered = kind ? categories.filter((c) => c.kind === kind) : categories
      const parents = filtered.filter((c) => !c.parent_id)
      const children = filtered.filter((c) => !!c.parent_id)

      return parents.map((parent) => ({
        ...parent,
        children: children.filter((c) => c.parent_id === parent.id),
      })) as CategoryWithChildren[]
    },
    [categories]
  )

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => createCategoryService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormData> }) =>
      updateCategoryService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => toggleArchiveCategory(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => toggleArchiveCategory(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategoryService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const seedMutation = useMutation({
    mutationFn: seedDefaultCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  return {
    categories,
    isLoading,
    error,
    categoryTree,
    createCategory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    archiveCategory: archiveMutation.mutateAsync,
    unarchiveCategory: unarchiveMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    seedDefaultCategories: seedMutation.mutateAsync,
    isSeeding: seedMutation.isPending,
  }
}

export type { Category, CategoryWithChildren }
