import { create } from 'zustand'
import { authService } from '@/api/authService'
import { setTokens, clearTokens, getAccessToken } from '@/api/client'
import type { Employee, LoginPayload } from '@/types/auth'
import type { RolePermission } from '@/types/hr'
import { AxiosError } from 'axios'
import type { ApiError } from '@/types/api'

interface AuthState {
  employee: Employee | null
  permissions: RolePermission[] | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  employee: null,
  permissions: null,
  isAuthenticated: false,
  isLoading: true, // Init to true so ProtectedRoute waits on F5/refresh
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authService.login(payload)
      const { access_token, refresh_token, employee } = data.data
      setTokens(access_token, refresh_token)

      // โหลดสิทธิ์ทันทีหลัง login สำเร็จ
      let permissions: RolePermission[] | null = null
      try {
        const permRes = await authService.getMyPermissions()
        const modules = permRes.data.data.modules
        permissions = modules
          ? Object.entries(modules).map(([module, perms]) => ({ module, ...perms }))
          : null
      } catch {
        // ถ้าโหลดสิทธิ์ไม่ได้ ยังให้ login ผ่านได้ แต่ permissions จะเป็น null
      }

      set({ employee, permissions, isAuthenticated: true, isLoading: false })
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      const message = axiosError.response?.data?.message ?? 'เข้าสู่ระบบไม่สำเร็จ'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      clearTokens()
      set({ employee: null, permissions: null, isAuthenticated: false })
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await authService.getMe()
      set({ employee: data.data, isAuthenticated: true })
    } catch {
      clearTokens()
      set({ employee: null, permissions: null, isAuthenticated: false })
    }
  },

  checkAuth: async () => {
    const token = getAccessToken()
    if (!token) {
      set({ isAuthenticated: false, employee: null, permissions: null, isLoading: false })
      return
    }
    set({ isLoading: true })
    try {
      const [meRes, permRes] = await Promise.all([
        authService.getMe(),
        authService.getMyPermissions().catch(() => null),
      ])
      const modules = permRes?.data.data.modules
      const permissions = modules
        ? Object.entries(modules).map(([module, perms]) => ({ module, ...perms }))
        : null
      set({
        employee: meRes.data.data,
        permissions,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (err) {
      // Clear tokens only on 401 (unauthorized) — not on network errors or 500s
      if (err instanceof AxiosError && err.response?.status === 401) {
        clearTokens()
      }
      set({ employee: null, permissions: null, isAuthenticated: false, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
