import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { GoodsReceipt, GoodsReceiptPayload, GoodsReceiptListParams } from '@/types/inventory'

export const goodsReceiptService = {
  getGoodsReceipts(params?: GoodsReceiptListParams) {
    return apiClient.get<PaginatedResponse<GoodsReceipt>>('/goods-receipts', { params })
  },

  getGoodsReceipt(id: number) {
    return apiClient.get<ApiResponse<GoodsReceipt>>(`/goods-receipts/${id}`)
  },

  createGoodsReceipt(payload: GoodsReceiptPayload) {
    return apiClient.post<ApiResponse<GoodsReceipt>>('/goods-receipts', payload)
  },

  updateGoodsReceipt(id: number, payload: Partial<GoodsReceiptPayload>) {
    return apiClient.put<ApiResponse<GoodsReceipt>>(`/goods-receipts/${id}`, payload)
  },

  deleteGoodsReceipt(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/goods-receipts/${id}`)
  },

  approveGoodsReceipt(id: number) {
    return apiClient.post<ApiResponse<null>>(`/goods-receipts/${id}/approve`)
  },

  cancelGoodsReceipt(id: number, note?: string) {
    return apiClient.post<ApiResponse<null>>(`/goods-receipts/${id}/cancel`, { note })
  },
}
