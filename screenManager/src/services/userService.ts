import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Role } from '../store/authStore'

export interface ManagedUser {
  id: number
  name: string
  user: string
  email: string
  status: '0' | '1'
  roleId: number | null
  role: Role | null
  permissions: string[]
  lastLoginAt: string | null
  lastSeenAt: string | null
  online: boolean
  createdAt: string
}

export interface RoleDetail extends Role {
  permissions: string[]
  usersCount: number
}

export interface Permission {
  id: number
  key: string
  description: string
}

export const userKeys = {
  all: ['users'] as const,
  detail: (id: number) => ['users', 'detail', id] as const,
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
}

/** Message the API returned for a failed request, or a fallback. */
export const apiError = (error: any, fallback: string): string => {
  const m = error?.response?.data?.message
  return (Array.isArray(m) ? m.join('. ') : m) || fallback
}

// Presence is refreshed often so the online dot stays truthful.
export const useUsers = () =>
  useQuery({
    queryKey: userKeys.all,
    queryFn: async () => (await api.get<ManagedUser[]>('/users')).data,
    refetchInterval: 15000,
  })

export const useUser = (id: number) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => (await api.get<ManagedUser>(`/users/${id}`)).data,
  })

export const useRoles = () =>
  useQuery({
    queryKey: userKeys.roles,
    queryFn: async () => (await api.get<RoleDetail[]>('/roles')).data,
  })

export const usePermissions = () =>
  useQuery({
    queryKey: userKeys.permissions,
    queryFn: async () => (await api.get<Permission[]>('/permissions')).data,
    staleTime: 5 * 60 * 1000,
  })

const invalidateUsers = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: userKeys.all })
  qc.invalidateQueries({ queryKey: userKeys.roles })
}

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; user: string; email: string; password: string; roleId?: number }) =>
      (await api.post('/auth/register', body)).data,
    onSuccess: () => invalidateUsers(qc),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; name?: string; email?: string; roleId?: number | null; status?: '0' | '1' }) =>
      (await api.patch<ManagedUser>(`/users/${id}`, body)).data,
    onSuccess: (_d, vars) => {
      invalidateUsers(qc)
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) })
    },
  })
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: async ({ id, ...body }: { id: number; currentPassword?: string; newPassword: string }) =>
      (await api.patch(`/users/${id}/password`, body)).data,
  })

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => invalidateUsers(qc),
  })
}

export const useCreateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string; permissions: string[] }) =>
      (await api.post<RoleDetail>('/roles', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.roles }),
  })
}

export const useUpdateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; name?: string; description?: string; permissions?: string[] }) =>
      (await api.patch<RoleDetail>(`/roles/${id}`, body)).data,
    onSuccess: () => invalidateUsers(qc),
  })
}

export const useDeleteRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/roles/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.roles }),
  })
}

/** "hace 5 min", "hace 3 h", "hace 2 d" or a date; "nunca" when null. */
export const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `hace ${d} d`
  return new Date(iso).toLocaleDateString()
}

export const formatDateTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString() : 'nunca'
