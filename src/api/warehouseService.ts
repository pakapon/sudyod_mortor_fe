import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Warehouse,
  WarehousePayload,
  WarehouseListParams,
  WarehouseLocation,
  WarehouseLocationPayload,
  InventoryItem,
  InventoryListParams,
  StockAdjustPayload,
} from '@/types/inventory'

export const warehouseService = {
  getWarehouses(params?: WarehouseListParams) {
    return apiClient.get<PaginatedResponse<Warehouse>>('/warehouses', { params })
  },

  getWarehouse(id: number) {
    return apiClient.get<ApiResponse<Warehouse>>(`/warehouses/${id}`)
  },

  createWarehouse(payload: WarehousePayload) {
    return apiClient.post<ApiResponse<Warehouse>>('/warehouses', payload)
  },

  updateWarehouse(id: number, payload: Partial<WarehousePayload>) {
    return apiClient.put<ApiResponse<Warehouse>>(`/warehouses/${id}`, payload)
  },

  deleteWarehouse(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/warehouses/${id}`)
  },

  // Locations
  getWarehouseLocations(warehouseId: number) {
    return apiClient.get<ApiResponse<WarehouseLocation[]>>(`/warehouses/${warehouseId}/locations`)
  },

  createWarehouseLocation(warehouseId: number, payload: WarehouseLocationPayload) {
    return apiClient.post<ApiResponse<WarehouseLocation>>(`/warehouses/${warehouseId}/locations`, payload)
  },

  updateWarehouseLocation(warehouseId: number, locationId: number, payload: Partial<WarehouseLocationPayload>) {
    return apiClient.put<ApiResponse<WarehouseLocation>>(`/warehouses/${warehouseId}/locations/${locationId}`, payload)
  },

  deleteWarehouseLocation(warehouseId: number, locationId: number) {
    return apiClient.delete<ApiResponse<null>>(`/warehouses/${warehouseId}/locations/${locationId}`)
  },

  // Inventory inside warehouse
  getWarehouseInventory(warehouseId: number, params?: InventoryListParams) {
    return apiClient.get<PaginatedResponse<InventoryItem>>(`/warehouses/${warehouseId}/inventory`, { params })
  },

  adjustStock(warehouseId: number, payload: StockAdjustPayload) {
    return apiClient.post<ApiResponse<null>>(`/warehouses/${warehouseId}/inventory/adjust`, payload)
  },
}
