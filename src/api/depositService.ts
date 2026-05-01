import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Deposit,
  DepositListParams,
  CreateDepositPayload,
} from '@/types/deposit'

export const depositService = {
  getDeposits(params?: DepositListParams) {
    return apiClient.get<PaginatedResponse<Deposit>>('/deposits', { params })
  },

  getDeposit(id: number) {
    return apiClient.get<ApiResponse<Deposit>>(`/deposits/${id}`)
  },

  create(payload: CreateDepositPayload) {
    return apiClient.post<ApiResponse<Deposit>>('/deposits', payload)
  },
}
