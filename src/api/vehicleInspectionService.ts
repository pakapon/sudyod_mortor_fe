import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  VehicleInspectionChecklist,
  VehicleInspectionChecklistPayload,
  VehicleInspectionListQuery,
} from '@/types/vehicleInspection'

export const vehicleInspectionService = {
  getChecklists(query?: VehicleInspectionListQuery) {
    return apiClient.get<PaginatedResponse<VehicleInspectionChecklist>>('/vehicle-inspection-checklists', {
      params: query,
      validateStatus: (status) => status < 500,
    })
  },

  getChecklist(id: number) {
    return apiClient.get<ApiResponse<VehicleInspectionChecklist>>(`/vehicle-inspection-checklists/${id}`)
  },

  createChecklist(payload: VehicleInspectionChecklistPayload) {
    return apiClient.post<ApiResponse<VehicleInspectionChecklist>>('/vehicle-inspection-checklists', payload)
  },

  updateChecklist(id: number, payload: VehicleInspectionChecklistPayload) {
    return apiClient.put<ApiResponse<VehicleInspectionChecklist>>(`/vehicle-inspection-checklists/${id}`, payload)
  },

  deleteChecklist(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/vehicle-inspection-checklists/${id}`)
  },
}
