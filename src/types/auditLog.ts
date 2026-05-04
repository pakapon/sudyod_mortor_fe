export type AuditLogAction = 'create' | 'update' | 'delete'

export interface AuditLogEmployeeRef {
  id: number
  first_name: string
  last_name: string
}

export interface AuditLogItem {
  id: number
  employee_id: number | null
  employee?: AuditLogEmployeeRef | null
  action: AuditLogAction
  entity_type: string
  entity_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AuditLogListParams {
  page?: number
  limit?: number
  employee_id?: number
  entity_type?: string
  action?: AuditLogAction
  date_from?: string
  date_to?: string
}

export const AUDIT_LOG_ACTION_LABEL: Record<AuditLogAction, string> = {
  create: 'สร้าง',
  update: 'แก้ไข',
  delete: 'ลบ',
}

export const AUDIT_LOG_ACTION_COLOR: Record<AuditLogAction, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-600',
}

/** Friendly Thai label for known entity types; falls back to raw value when missing. */
export const AUDIT_LOG_ENTITY_LABEL: Record<string, string> = {
  branches: 'สาขา',
  positions: 'ตำแหน่ง',
  employees: 'พนักงาน',
  work_schedules: 'ตารางการทำงาน',
  attendance: 'ลงเวลา',
  holidays: 'วันหยุด',
  customers: 'ลูกค้า',
  vendors: 'ผู้ขาย',
  brands: 'ยี่ห้อ',
  product_categories: 'หมวดสินค้า',
  product_units: 'หน่วยสินค้า',
  products: 'สินค้า',
  warehouses: 'คลัง',
  inventory: 'สต็อก',
  goods_receipts: 'รับสินค้า',
  stock_transfers: 'โอนย้ายสต็อก',
  purchase_orders: 'ใบสั่งซื้อ',
  service_orders: 'ใบงานซ่อม',
  quotations: 'ใบเสนอราคา',
  invoices: 'ใบแจ้งหนี้',
  deposits: 'มัดจำ',
  delivery_notes: 'ใบส่งของ',
  warranties: 'ใบรับประกัน',
  receipts: 'ใบเสร็จ',
  loan_applications: 'คำขอสินเชื่อ',
  store_loans: 'สินเชื่อร้าน',
  notifications: 'การแจ้งเตือน',
  vehicle_inspection_checklists: 'รายการตรวจสภาพรถ',
  customer_vehicles: 'รถลูกค้า',
}
