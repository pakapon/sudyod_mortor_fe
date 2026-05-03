import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  DashboardStatsResponse,
  DashboardChartsResponse,
  DashboardActivity,
  DashboardSoTrackingItem,
  DashboardReceiptItem,
  DashboardAtRiskCustomer,
} from '@/types/dashboard'

export const dashboardService = {
  getStats() {
    return apiClient.get<ApiResponse<DashboardStatsResponse>>('/dashboard/stats')
  },

  getCharts(period: 'month' | 'year') {
    return apiClient.get<ApiResponse<DashboardChartsResponse>>('/dashboard/charts', {
      params: { period },
    })
  },

  getActivities() {
    return apiClient.get<ApiResponse<DashboardActivity[]>>('/dashboard/activities')
  },

  getSoTracking() {
    return apiClient.get<ApiResponse<DashboardSoTrackingItem[]>>('/dashboard/so-tracking')
  },

  getReceipts() {
    return apiClient.get<ApiResponse<DashboardReceiptItem[]>>('/dashboard/receipts')
  },

  getAtRiskCustomers() {
    return apiClient.get<ApiResponse<DashboardAtRiskCustomer[]>>('/dashboard/at-risk-customers')
  },
}
