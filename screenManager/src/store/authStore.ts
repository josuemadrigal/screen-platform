import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { API_URL } from '../lib/config'

export interface Role {
  id: number
  name: string
  description?: string | null
  isSystem?: boolean
}

export interface User {
  id: number
  email: string
  name: string
  user?: string
  role?: Role | null
  permissions?: string[]
}

/** Permission keys, mirrored from the API's permissions catalogue. */
export const PERM = {
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  CONTENT_MANAGE: 'content.manage',
  SCREENS_CONTROL: 'screens.control',
  HISTORY_VIEW: 'history.view',
} as const

/** Spanish labels for the permission keys shown in the panel. */
export const PERM_LABELS: Record<string, string> = {
  [PERM.USERS_VIEW]: 'Ver usuarios',
  [PERM.USERS_MANAGE]: 'Gestionar usuarios',
  [PERM.CONTENT_MANAGE]: 'Gestionar contenido',
  [PERM.SCREENS_CONTROL]: 'Controlar pantallas',
  [PERM.HISTORY_VIEW]: 'Ver historial',
}
export const permLabel = (key: string) => PERM_LABELS[key] ?? key

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  login: (email: string, password: string) => Promise<boolean>
  /** Reloads the current user (role/permissions may have changed since login). */
  refreshMe: () => Promise<void>
  hasPermission: (key: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      login: async (email: string, password: string) => {
        const { data } = await axios.post(`${API_URL}/auth/login`, { email, password })
        if (data.token) {
          set({ user: data.user, token: data.token })
          return true
        }
        return false
      },
      refreshMe: async () => {
        const token = get().token
        if (!token) return
        try {
          const { data } = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
          set({ user: data })
        } catch (err: any) {
          // Token expired, user deactivated or deleted: back to login.
          if (err?.response?.status === 401) set({ user: null, token: null })
        }
      },
      hasPermission: (key) => !!get().user?.permissions?.includes(key),
    }),
    {
      name: 'auth-storage',
    }
  )
)
