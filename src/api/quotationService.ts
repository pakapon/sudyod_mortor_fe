import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Quotation,
  QuotationListParams,
  CreateQuotationPayload,
  UpdateQuotationPayload,
  RejectPayload,
} from '@/types/quotation'

export const quotationService = {
  // ── List & Detail ────────────────────────────────────────────────────────
  getQuotations(params?: QuotationListParams) {
    return apiClient.get<PaginatedResponse<Quotation>>('/quotations', { params })
  },

  getQuotation(id: number) {
    return apiClient.get<ApiResponse<Quotation>>(`/quotations/${id}`)
  },

  // ── Create & Update ──────────────────────────────────────────────────────
  createQuotation(payload: CreateQuotationPayload) {
    return apiClient.post<ApiResponse<Quotation>>('/quotations', payload)
  },

  updateQuotation(id: number, payload: UpdateQuotationPayload) {
    return apiClient.patch<ApiResponse<Quotation>>(`/quotations/${id}`, payload)
  },

  // ── Status Transitions ───────────────────────────────────────────────────
  send(id: number) {
    return apiClient.patch<ApiResponse<Quotation>>(`/quotations/${id}/send`, {})
  },

  approve(id: number) {
    return apiClient.patch<ApiResponse<Quotation>>(`/quotations/${id}/approve`, {})
  },

  reject(id: number, payload: RejectPayload) {
    return apiClient.patch<ApiResponse<Quotation>>(`/quotations/${id}/reject`, payload)
  },

  // ── Export ───────────────────────────────────────────────────────────────
  exportQuotations(params?: QuotationListParams) {
    return apiClient.get('/quotations/export', { params, responseType: 'blob' })
  },
}
