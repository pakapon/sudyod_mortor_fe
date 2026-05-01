import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  NotificationItem,
  NotificationListParams,
  UnreadCountResponse,
} from '@/types/notification'

export const notificationService = {
  getNotifications(params: NotificationListParams = {}) {
    const query: Record<string, unknown> = {}
    if (params.page !== undefined) query.page = params.page
    if (params.limit !== undefined) query.limit = params.limit
    if (params.is_read !== undefined) query.is_read = params.is_read ? 'true' : 'false'
    if (params.type) query.type = params.type
    return apiClient.get<PaginatedResponse<NotificationItem>>('/notifications', {
      params: query,
    })
  },

  getUnreadCount() {
    return apiClient.get<ApiResponse<UnreadCountResponse>>('/notifications/unread-count')
  },

  markRead(id: number) {
    return apiClient.patch<ApiResponse<NotificationItem>>(`/notifications/${id}/read`)
  },

  markAllRead() {
    return apiClient.patch<ApiResponse<{ updated: number }>>('/notifications/read-all')
  },
}

/**
 * Map notification type + data payload to a UI route.
 * Returns null if the notification has no associated page.
 */
export function buildNotificationLink(n: NotificationItem): string | null {
  const data = (n.data ?? {}) as Record<string, unknown>
  const num = (key: string): number | null => {
    const v = data[key]
    return typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null
  }

  switch (n.type) {
    case 'so_assigned':
    case 'so_status_change': {
      const id = num('service_order_id')
      return id !== null ? `/billing/jobs/${id}` : '/billing/documents'
    }
    case 'invoice_overdue': {
      return '/billing/documents?type=invoice'
    }
    case 'store_loan_overdue': {
      const id = num('store_loan_id')
      return id !== null ? `/store-loans/${id}` : '/store-loans'
    }
    case 'service_reminder': {
      const customerId = num('customer_id')
      return customerId !== null ? `/customers/${customerId}` : '/customers'
    }
    case 'stock_transfer_approved': {
      const id = num('transfer_id') ?? num('stock_transfer_id')
      return id !== null ? `/stock-transfers/${id}` : '/stock-transfers'
    }
    case 'low_stock': {
      return '/inventory'
    }
    case 'permission_changed':
      return '/profile'
    case 'system': {
      const soId = num('service_order_id')
      if (soId !== null) return `/billing/jobs/${soId}`
      const customerId = num('customer_id')
      if (customerId !== null) return `/customers/${customerId}`
      const productId = num('product_id')
      if (productId !== null) return `/products/${productId}`
      return '/billing/documents'
    }
    default:
      return null
  }
}
