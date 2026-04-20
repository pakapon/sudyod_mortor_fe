import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { PurchaseOrder, PurchaseOrderPayload, PurchaseOrderListParams, Vendor } from '@/types/inventory'

export const purchaseOrderService = {
  getPurchaseOrders(params?: PurchaseOrderListParams) {
    return apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params })
  },

  getPurchaseOrder(id: number) {
    return apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`)
  },

  createPurchaseOrder(payload: PurchaseOrderPayload) {
    return apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', payload)
  },

  updatePurchaseOrder(id: number, payload: Partial<PurchaseOrderPayload>) {
    return apiClient.put<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, payload)
  },

  deletePurchaseOrder(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/purchase-orders/${id}`)
  },

  sendPurchaseOrder(id: number) {
    return apiClient.post<ApiResponse<null>>(`/purchase-orders/${id}/send`)
  },

  receivePurchaseOrder(id: number) {
    return apiClient.post<ApiResponse<null>>(`/purchase-orders/${id}/receive`)
  },

  cancelPurchaseOrder(id: number, note?: string) {
    return apiClient.post<ApiResponse<null>>(`/purchase-orders/${id}/cancel`, { note })
  },

  // Vendor lookup
  getVendors(params?: { search?: string; is_active?: boolean }) {
    return apiClient.get<ApiResponse<Vendor[]>>('/vendors', { params })
  },
}
