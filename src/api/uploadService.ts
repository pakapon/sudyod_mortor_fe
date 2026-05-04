import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'

interface UploadPayload {
  file: File | Blob
  module: string
  entity_id: number
  category: string
  entity_type?: string
  metadata?: Record<string, unknown>
}

export const uploadService = {
  uploadFile<T>(payload: UploadPayload) {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('module', payload.module)
    formData.append('entity_id', String(payload.entity_id))
    formData.append('category', payload.category)
    if (payload.entity_type) {
      formData.append('entity_type', payload.entity_type)
    }
    if (payload.metadata && Object.keys(payload.metadata).length > 0) {
      formData.append('metadata', JSON.stringify(payload.metadata))
    }

    return apiClient.post<ApiResponse<T>>('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}