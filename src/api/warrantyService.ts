import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Warranty,
  WarrantyListParams,
  CreateWarrantyPayload,
} from '@/types/warranty'

export const warrantyService = {
  getWarranties(params?: WarrantyListParams) {
    return apiClient.get<PaginatedResponse<Warranty>>('/warranties', { params })
  },

  getWarranty(id: number) {
    return apiClient.get<ApiResponse<Warranty>>(`/warranties/${id}`)
  },

  create(payload: CreateWarrantyPayload) {
    return apiClient.post<ApiResponse<Warranty>>('/warranties', payload)
  },
}
