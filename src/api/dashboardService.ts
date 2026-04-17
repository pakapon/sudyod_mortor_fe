import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  DashboardSummary,
  DashboardStats,
  Notification,
} from '@/types/dashboard'

export const dashboardService = {
  getSummary() {
    return apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary')
  },

  getStats() {
    return apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats')
  },

  getNotifications() {
    return apiClient.get<ApiResponse<Notification[]>>('/notifications')
  },

  markNotificationRead(id: number) {
    return apiClient.patch<ApiResponse<null>>(`/notifications/${id}/read`)
  },

  markAllNotificationsRead() {
    return apiClient.patch<ApiResponse<null>>('/notifications/read-all')
  },
}
