import type { RolePermission } from '@/types/hr'

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_approve' | 'can_export'

/**
 * เช็คว่าผู้ใช้มีสิทธิ์ใน module/action ที่ระบุหรือไม่
 * ใช้ร่วมกันทั้ง Sidebar, route guard, และปุ่ม action
 */
export function hasPermission(
  permissions: RolePermission[] | null | undefined,
  module: string,
  action: PermissionAction = 'can_view',
): boolean {
  if (!permissions) return false
  const perm = permissions.find((p) => p.module === module)
  if (!perm) return false
  return perm[action] === true
}

/**
 * เช็คว่ามีสิทธิ์ view อย่างน้อย 1 module จากรายการที่ให้
 * ใช้สำหรับ parent menu ที่มี children
 */
export function hasAnyPermission(
  permissions: RolePermission[] | null | undefined,
  modules: string[],
): boolean {
  if (!permissions) return false
  return modules.some((m) => hasPermission(permissions, m, 'can_view'))
}

/**
 * Module keys ที่ backend กำหนด (23 modules)
 * ใช้เป็น single source of truth สำหรับ mapping เมนู/route
 */
export const ALL_MODULES = [
  'branches', 'positions', 'employees', 'work_schedules', 'attendance', 'holidays',
  'customers', 'vendors',
  'brands', 'product_categories', 'product_units', 'products',
  'warehouses', 'inventory', 'goods_receipts', 'stock_transfers', 'purchase_orders',
  'service_orders', 'quotations', 'invoices',
  'loan_applications', 'store_loans',
  'vehicle_inspection_checklists',
  'audit_logs',
] as const

export type ModuleKey = typeof ALL_MODULES[number]

/** Menu → Permission module mapping */
export const MENU_PERMISSION_MAP: Record<string, ModuleKey | ModuleKey[]> = {
  dashboard: 'branches', // dashboard ไม่มี dedicated permission, fallback
  customer: 'customers',
  service: 'service_orders',
  billing: ['service_orders', 'quotations', 'invoices'],
  product: ['products', 'warehouses', 'goods_receipts', 'stock_transfers', 'purchase_orders'],
  credit: ['loan_applications', 'store_loans'],
  team: ['employees', 'attendance', 'holidays'],
  settings: ['branches', 'positions', 'work_schedules', 'brands', 'product_categories', 'product_units', 'vendors', 'products', 'vehicle_inspection_checklists'],
  auditLog: 'audit_logs',
  notification: 'branches', // notifications ไม่ต้อง permission
}

/** Child menu path → permission module mapping */
export const ROUTE_PERMISSION_MAP: Record<string, ModuleKey> = {
  '/customers': 'customers',
  '/service-orders': 'service_orders',
  '/quotations': 'quotations',
  '/invoices': 'invoices',
  '/deposits': 'invoices',
  '/delivery-notes': 'invoices',
  '/warranties': 'invoices',
  '/billing': 'service_orders',
  '/billing/pos': 'invoices',
  '/billing/documents': 'invoices',
  '/products': 'products',
  '/warehouses': 'warehouses',
  '/goods-receipts': 'goods_receipts',
  '/stock-transfers': 'stock_transfers',
  '/purchase-orders': 'purchase_orders',
  '/loan-applications': 'loan_applications',
  '/store-loans': 'store_loans',
  '/loans/search': 'loan_applications',
  '/hr/employees': 'employees',
  '/hr/attendance': 'attendance',
  '/hr/holidays': 'holidays',
  '/hr/work-schedules': 'work_schedules',
  '/settings/branches': 'branches',
  '/settings/work-schedules': 'work_schedules',
  '/settings/positions': 'positions',
  '/settings/roles': 'positions',
  '/settings/brands': 'brands',
  '/settings/categories': 'product_categories',
  '/settings/units': 'product_units',
  '/settings/vendors': 'vendors',
  '/settings/finance-companies': 'vendors',
  '/settings/vehicle-inspection-checklists': 'vehicle_inspection_checklists',
}

