import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Invoice,
  InvoiceListParams,
  CreateInvoiceFromQTPayload,
  CreateRetailInvoicePayload,
  CreatePaymentPayload,
  Payment,
  Receipt,
} from '@/types/invoice'

export const invoiceService = {
  // ── List & Detail ────────────────────────────────────────────────────────
  getInvoices(params?: InvoiceListParams) {
    return apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params })
  },

  getInvoice(id: number) {
    return apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`)
  },

  // ── Create ───────────────────────────────────────────────────────────────
  createFromQuotation(payload: CreateInvoiceFromQTPayload) {
    return apiClient.post<ApiResponse<Invoice>>('/invoices/from-quotation', payload)
  },

  createRetail(payload: CreateRetailInvoicePayload) {
    return apiClient.post<ApiResponse<Invoice>>('/invoices/retail', payload)
  },

  // ── Status Transitions ───────────────────────────────────────────────────
  issue(id: number) {
    return apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/issue`, {})
  },

  // ── Payments ─────────────────────────────────────────────────────────────
  getPayments(id: number) {
    return apiClient.get<ApiResponse<Payment[]>>(`/invoices/${id}/payments`)
  },

  addPayment(id: number, payload: CreatePaymentPayload) {
    return apiClient.post<ApiResponse<Payment>>(`/invoices/${id}/payments`, payload)
  },

  // ── Receipt ──────────────────────────────────────────────────────────────
  issueReceipt(id: number) {
    return apiClient.post<ApiResponse<Receipt>>(`/invoices/${id}/issue-receipt`, {})
  },

  // ── Export ───────────────────────────────────────────────────────────────
  exportInvoices(params?: InvoiceListParams) {
    return apiClient.get('/invoices/export', { params, responseType: 'blob' })
  },
}
