import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Screen {
  id: number;
  name: string;
  code: string;
  location: string;
  status: number;
  playlist?: string;
  createdAt: string;
  updatedAt: string;
}

export const screenKeys = {
  all: ['screens'] as const,
  details: () => [...screenKeys.all, 'detail'] as const,
  detail: (id: number) => [...screenKeys.details(), id] as const,
}

export const useScreens = () => {
  return useQuery({
    queryKey: screenKeys.all,
    queryFn: async () => {
      const { data } = await api.get<Screen[]>('/screens')
      return data
    },
  })
}

export const useCreateScreen = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newScreen: Partial<Screen>) => {
      const { data } = await api.post<Screen>('/screens', newScreen)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screenKeys.all })
    },
  })
}

export const useUpdateScreen = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Screen> & { id: number }) => {
      const { data } = await api.patch<Screen>(`/screens/${id}`, update)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screenKeys.all })
    },
  })
}

export const useDeleteScreen = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/screens/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screenKeys.all })
    },
  })
}
