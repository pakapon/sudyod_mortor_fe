import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderGpsPhoto,
  ServiceOrderSummary,
  ServiceOrderListParams,
  CreateServiceOrderPayload,
  UpdateServiceOrderPayload,
  ServiceOrderItemPayload,
  TransitionPayload,
  AssignPayload,
} from '@/types/serviceOrder'

export const serviceOrderService = {
  // ── List & Detail ────────────────────────────────────────────────────────
  getServiceOrders(params?: ServiceOrderListParams) {
    return apiClient.get<PaginatedResponse<ServiceOrder>>('/service-orders', { params })
  },

  getServiceOrder(id: number) {
    return apiClient.get<ApiResponse<ServiceOrder>>(`/service-orders/${id}`)
  },

  createServiceOrder(payload: CreateServiceOrderPayload) {
    return apiClient.post<ApiResponse<ServiceOrder>>('/service-orders', payload)
  },

  updateServiceOrder(id: number, payload: UpdateServiceOrderPayload) {
    return apiClient.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}`, payload)
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  getItems(id: number) {
    return apiClient.get<ApiResponse<ServiceOrderItem[]>>(`/service-orders/${id}/items`)
  },

  addItem(id: number, payload: ServiceOrderItemPayload) {
    return apiClient.post<ApiResponse<ServiceOrderItem>>(`/service-orders/${id}/items`, payload)
  },

  deleteItem(id: number, itemId: number) {
    return apiClient.delete<ApiResponse<null>>(`/service-orders/${id}/items/${itemId}`)
  },

  // ── Status Transitions ───────────────────────────────────────────────────
  transition(id: number, payload: TransitionPayload) {
    return apiClient.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}/transition`, payload)
  },

  assign(id: number, payload: AssignPayload) {
    return apiClient.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}/assign`, payload)
  },

  cancel(id: number, note?: string) {
    return apiClient.post<ApiResponse<ServiceOrder>>(`/service-orders/${id}/cancel`, { note })
  },

  reopen(id: number) {
    return apiClient.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}/reopen`, {})
  },

  // ── GPS Photos ────────────────────────────────────────────────────────────
  getGpsPhotos(id: number) {
    return apiClient.get<ApiResponse<ServiceOrderGpsPhoto[]>>(`/service-orders/${id}/gps-photos`)
  },

  uploadGpsPhoto(id: number, formData: FormData) {
    return apiClient.post<ApiResponse<ServiceOrderGpsPhoto>>(
      `/service-orders/${id}/gps-photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteGpsPhoto(id: number, photoId: number) {
    return apiClient.delete<ApiResponse<null>>(`/service-orders/${id}/gps-photos/${photoId}`)
  },

  // ── Summary & Export ─────────────────────────────────────────────────────
  getSummary() {
    return apiClient.get<ApiResponse<ServiceOrderSummary>>('/service-orders/summary')
  },

  exportServiceOrders(params?: ServiceOrderListParams) {
    return apiClient.get('/service-orders/export', { params, responseType: 'blob' })
  },
}
