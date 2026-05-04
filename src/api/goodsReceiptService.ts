import { apiClient } from './client'
import { uploadService } from '@/api/uploadService'
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
    return uploadService.uploadFile<GoodsReceiptDocument>({
      file,
      module: 'goods_receipts',
      entity_id: id,
      category: 'document',
      metadata: {
        file_type: options?.file_type ?? 'other',
        file_name: options?.file_name,
        note: options?.note,
      },
    })
  },

  deleteDocument(receiptId: number, documentId: number) {
    return apiClient.delete<ApiResponse<null>>(`/goods-receipts/${receiptId}/documents/${documentId}`)
  },
}
