import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type {
  DeliveryNote,
  CreateDeliveryNotePayload,
  SignDeliveryNotePayload,
} from '@/types/deliveryNote'

export const deliveryNoteService = {
  getDeliveryNote(id: number) {
    return apiClient.get<ApiResponse<DeliveryNote>>(`/delivery-notes/${id}`)
  },

  create(payload: CreateDeliveryNotePayload) {
    return apiClient.post<ApiResponse<DeliveryNote>>('/delivery-notes', payload)
  },

  sign(id: number, payload: SignDeliveryNotePayload) {
    return apiClient.patch<ApiResponse<DeliveryNote>>(`/delivery-notes/${id}/sign`, payload)
  },
}
