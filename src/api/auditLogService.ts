import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { AuditLogItem, AuditLogListParams } from '@/types/auditLog'

export const auditLogService = {
  getAuditLogs(params: AuditLogListParams = {}) {
    const query: Record<string, unknown> = {}
    if (params.page !== undefined) query.page = params.page
    if (params.limit !== undefined) query.limit = params.limit
    if (params.employee_id !== undefined) query.employee_id = params.employee_id
    if (params.entity_type) query.entity_type = params.entity_type
    if (params.action) query.action = params.action
    if (params.date_from) query.date_from = params.date_from
    if (params.date_to) query.date_to = params.date_to
    return apiClient.get<PaginatedResponse<AuditLogItem>>('/audit-logs', { params: query })
  },

  getEntityTypes() {
    return apiClient.get<ApiResponse<string[]>>('/audit-logs/entity-types')
  },

  exportCsv(params: AuditLogListParams = {}) {
    const query: Record<string, unknown> = {}
    if (params.employee_id !== undefined) query.employee_id = params.employee_id
    if (params.entity_type) query.entity_type = params.entity_type
    if (params.action) query.action = params.action
    if (params.date_from) query.date_from = params.date_from
    if (params.date_to) query.date_to = params.date_to
    return apiClient.get<Blob>('/audit-logs/export', {
      params: query,
      responseType: 'blob',
    })
  },
}
