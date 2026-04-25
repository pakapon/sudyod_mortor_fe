import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  GoodsReceipt,
  GoodsReceiptPayload,
  GoodsReceiptListParams,
  GoodsReceiptDocument,
  GoodsReceiptDocumentType,
} from '@/types/inventory'

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

  // ── Documents ─────────────────────────────────────────────────────────────
  getDocuments(id: number) {
    return apiClient.get<ApiResponse<GoodsReceiptDocument[]>>(`/goods-receipts/${id}/documents`)
  },

  uploadDocument(
    id: number,
    file: File,
    options?: { file_type?: GoodsReceiptDocumentType; file_name?: string; note?: string },
  ) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('file_type', options?.file_type ?? 'other')
    if (options?.file_name) formData.append('file_name', options.file_name)
    if (options?.note) formData.append('note', options.note)
    return apiClient.post<ApiResponse<GoodsReceiptDocument>>(
      `/goods-receipts/${id}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteDocument(receiptId: number, documentId: number) {
    return apiClient.delete<ApiResponse<null>>(`/goods-receipts/${receiptId}/documents/${documentId}`)
  },
}
