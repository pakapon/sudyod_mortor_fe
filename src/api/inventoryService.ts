import { apiClient } from './client'
import type { PaginatedResponse } from '@/types/api'
import type { InventoryItem, InventoryListParams, InventoryTransaction, InventoryTransactionListParams } from '@/types/inventory'

export const inventoryService = {
  getInventory(params?: InventoryListParams) {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory', { params })
  },

  getLowStock(params?: InventoryListParams) {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory/low-stock', { params })
  },

  getTransactions(params?: InventoryTransactionListParams) {
    return apiClient.get<PaginatedResponse<InventoryTransaction>>('/inventory/transactions', { params })
  },

  exportInventory(params?: Omit<InventoryListParams, 'page' | 'limit'>) {
    return apiClient.get('/inventory/export', { params, responseType: 'blob' })
  },
}
