import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { apiClient } from '../api/client'
import type { AuthUser, TokenResponse } from '../api/types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  /** true cho tới khi hoàn tất thử khôi phục phiên đăng nhập từ refreshToken đã lưu */
  isBootstrapping: boolean

  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<string | null>
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isBootstrapping: true,

      login: async (username, password) => {
        const { data } = await apiClient.post<TokenResponse>('/auth/login', { username, password })
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        const me = await apiClient.get<AuthUser>('/auth/me')
        set({ user: me.data })
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null })
      },

      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken
        if (!refreshToken) return null
        try {
          const { data } = await apiClient.post<TokenResponse>('/auth/refresh', { refreshToken })
          set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
          return data.accessToken
        } catch {
          set({ user: null, accessToken: null, refreshToken: null })
          return null
        }
      },

      bootstrap: async () => {
        const token = await get().refreshAccessToken()
        if (token) {
          try {
            const me = await apiClient.get<AuthUser>('/auth/me')
            set({ user: me.data })
          } catch {
            set({ user: null, accessToken: null, refreshToken: null })
          }
        }
        set({ isBootstrapping: false })
      },
    }),
    {
      name: 'erp-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
)
