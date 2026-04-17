import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { RolePermission } from '@/types/hr'
import type {
  LoginPayload,
  LoginResponse,
  ForgotPasswordPayload,
  VerifyOtpPayload,
  VerifyOtpResponse,
  ResetPasswordPayload,
  ChangePasswordPayload,
  RefreshTokenPayload,
  Employee,
  Session,
} from '@/types/auth'

export const authService = {
  login(payload: LoginPayload) {
    return apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  },

  logout() {
    return apiClient.post<ApiResponse<null>>('/auth/logout')
  },

  refreshToken(payload: RefreshTokenPayload) {
    return apiClient.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      '/auth/refresh-token',
      payload,
    )
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    return apiClient.post<ApiResponse<null>>('/auth/forgot-password', payload)
  },

  verifyOtp(payload: VerifyOtpPayload) {
    return apiClient.post<ApiResponse<VerifyOtpResponse>>('/auth/verify-otp', payload)
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiClient.post<ApiResponse<null>>('/auth/reset-password', payload)
  },

  getMe() {
    return apiClient.get<ApiResponse<Employee>>('/auth/me')
  },

  changePassword(payload: ChangePasswordPayload) {
    return apiClient.put<ApiResponse<null>>('/auth/change-password', payload)
  },

  getSessions() {
    return apiClient.get<ApiResponse<Session[]>>('/auth/sessions')
  },

  deleteSession(sessionId: string) {
    return apiClient.delete<ApiResponse<null>>(`/auth/sessions/${sessionId}`)
  },

  getMyPermissions() {
    return apiClient.get<ApiResponse<{
      permissions: string[]
      modules: Record<string, Omit<RolePermission, 'module'>>
      branch_ids: number[]
    }>>('/permissions/me')
  },
}
