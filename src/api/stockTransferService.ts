import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { StockTransfer, StockTransferPayload, StockTransferListParams } from '@/types/inventory'

export const stockTransferService = {
  getStockTransfers(params?: StockTransferListParams) {
    return apiClient.get<PaginatedResponse<StockTransfer>>('/stock-transfers', { params })
  },

  getStockTransfer(id: number) {
    return apiClient.get<ApiResponse<StockTransfer>>(`/stock-transfers/${id}`)
  },

  createStockTransfer(payload: StockTransferPayload) {
    return apiClient.post<ApiResponse<StockTransfer>>('/stock-transfers', payload)
  },

  updateStockTransfer(id: number, payload: Partial<StockTransferPayload>) {
    return apiClient.patch<ApiResponse<StockTransfer>>(`/stock-transfers/${id}`, payload)
  },

  deleteStockTransfer(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/stock-transfers/${id}`)
  },

  approveStockTransfer(id: number) {
    return apiClient.post<ApiResponse<null>>(`/stock-transfers/${id}/approve`)
  },

  cancelStockTransfer(id: number, reason?: string) {
    return apiClient.post<ApiResponse<null>>(`/stock-transfers/${id}/cancel`, { reason })
  },

  completeStockTransfer(id: number) {
    return apiClient.post<ApiResponse<null>>(`/stock-transfers/${id}/complete`)
  },
}
