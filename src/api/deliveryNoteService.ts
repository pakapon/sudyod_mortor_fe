import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type {
  DeliveryNote,
  CreateDeliveryNotePayload,
  SignDeliveryNotePayload,
} from '@/types/deliveryNote'
import type { ServiceOrderGpsPhoto } from '@/types/serviceOrder'

export const deliveryNoteService = {
  getDeliveryNotes(params?: { owner_type?: string; owner_id?: number; page?: number; limit?: number }) {
    return apiClient.get<ApiResponse<DeliveryNote[]>>('/delivery-notes', { params })
  },

  getDeliveryNote(id: number) {
    return apiClient.get<ApiResponse<DeliveryNote>>(`/delivery-notes/${id}`)
  },

  create(payload: CreateDeliveryNotePayload) {
    return apiClient.post<ApiResponse<DeliveryNote>>('/delivery-notes', payload)
  },

  sign(id: number, payload: SignDeliveryNotePayload) {
    return apiClient.patch<ApiResponse<DeliveryNote>>(`/delivery-notes/${id}/sign`, payload)
  },

  getGpsPhotos(id: number) {
    return apiClient.get<ApiResponse<ServiceOrderGpsPhoto[]>>(`/delivery-notes/${id}/gps-photos`)
  },

  uploadGpsPhoto(id: number, formData: FormData) {
    return apiClient.post<ApiResponse<ServiceOrderGpsPhoto>>(`/delivery-notes/${id}/gps-photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
