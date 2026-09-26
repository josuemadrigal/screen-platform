import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { API_URL } from '../lib/config'

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  login: (email: string, password: string) => Promise<boolean>;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'auth-storage',
    }
  )
)
