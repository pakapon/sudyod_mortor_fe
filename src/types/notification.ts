export type NotificationType =
  | 'so_assigned'
  | 'so_status_change'
  | 'invoice_overdue'
  | 'store_loan_overdue'
  | 'service_reminder'
  | 'low_stock'
  | 'permission_changed'
  | 'stock_transfer_approved'
  | 'system'

export interface NotificationItem {
  id: number
  employee_id: number
  type: NotificationType | string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export interface NotificationListParams {
  page?: number
  limit?: number
  is_read?: boolean
  type?: NotificationType | ''
}

export interface UnreadCountResponse {
  unread_count: number
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  so_assigned: 'มอบหมายงานซ่อม',
  so_status_change: 'อัพเดตสถานะใบสั่งซ่อม',
  invoice_overdue: 'ใบแจ้งหนี้เกินกำหนด',
  store_loan_overdue: 'สินเชื่อร้านเกินกำหนด',
  service_reminder: 'เตือนเช็คระยะ',
  low_stock: 'สต็อกต่ำกว่ากำหนด',
  permission_changed: 'เปลี่ยนสิทธิ์การใช้งาน',
  stock_transfer_approved: 'อนุมัติโอนย้ายสต็อก',
  system: 'ระบบ',
}

export const NOTIFICATION_TYPE_COLOR: Record<NotificationType, string> = {
  so_assigned: 'bg-blue-100 text-blue-700',
  so_status_change: 'bg-blue-100 text-blue-700',
  invoice_overdue: 'bg-red-100 text-red-700',
  store_loan_overdue: 'bg-red-100 text-red-700',
  service_reminder: 'bg-yellow-100 text-yellow-700',
  low_stock: 'bg-yellow-100 text-yellow-700',
  permission_changed: 'bg-gray-100 text-gray-700',
  stock_transfer_approved: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
}
