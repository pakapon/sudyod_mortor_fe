import type { Employee as BaseEmployee } from './auth'

export interface Employee extends Omit<BaseEmployee, 'status'> {
  nickname?: string
  is_active: boolean
  status?: string
  role_ids?: number[]
  roles?: Role[]
  work_schedule_id?: number
}

export interface Branch {
  id: number
  name: string
  code: string
  is_active: boolean
}

export interface Position {
  id: number
  name: string
  description?: string
  is_active: boolean
}

export interface EmployeePayload {
  branch_id?: number
  position_id: number
  employee_code?: string
  first_name: string
  last_name: string
  nickname?: string
  email?: string
  phone?: string
  password?: string
  status?: string
  is_active: boolean
  role_id?: number
  work_schedule_id?: number
}

export interface RolePermission {
  module: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  can_export: boolean
}

export interface Role {
  id: number
  name: string
  description: string | null
  is_active: boolean
  employee_count?: number
  permissions?: RolePermission[]
}

export interface RolePayload {
  name: string
  description?: string
  is_active: boolean
}

export interface UpdateRolePermissionsPayload {
  permissions: RolePermission[]
}

export interface WorkScheduleDay {
  day_of_week: number // 0=Sunday, 1=Monday...
  is_working: boolean
  start_time: string | null
  end_time: string | null
}

export interface WorkSchedule {
  id: number
  owner_type: 'position' | 'employee'
  owner_id: number
  name: string
  login_start_time: string
  login_end_time: string
  grace_minutes: number
  is_active: boolean
  days?: WorkScheduleDay[]
}

export interface WorkSchedulePayload {
  owner_type: 'position' | 'employee'
  owner_id: number
  name: string
  login_start_time: string
  login_end_time: string
  grace_minutes: number
  is_active: boolean
  days: WorkScheduleDay[]
}

export interface FinanceCompany {
  id: number
  name: string
  address?: string
  phone?: string
  contact_name?: string
  is_active: boolean
}

export interface BranchPayload {
  name: string
  code: string
  is_active: boolean
}

export interface PositionPayload {
  name: string
  description?: string
  is_active: boolean
}

export interface FinanceCompanyPayload {
  name: string
  address?: string
  phone?: string
  contact_name?: string
  is_active: boolean
}

// ─── Brand ───
export interface Brand {
  id: number
  name: string
  code: string
  is_active: boolean
}

export interface BrandPayload {
  name: string
  code: string
  is_active: boolean
}

// ─── Product Category ───
export interface ProductCategory {
  id: number
  name: string
  code?: string
  parent_id: number | null
  description?: string
  is_active: boolean
  children?: ProductCategory[]
}

export interface ProductCategoryPayload {
  name: string
  code?: string
  parent_id?: number | null
  description?: string
  is_active: boolean
}

// ─── Product Unit ───
export interface ProductUnit {
  id: number
  name: string
  abbreviation: string
  is_active: boolean
}

export interface ProductUnitPayload {
  name: string
  abbreviation: string
  is_active: boolean
}

// ─── Vendor ───
export interface Vendor {
  id: number
  name: string
  code?: string
  tax_id?: string
  contact_name?: string
  email?: string
  address?: string
  province?: string
  district?: string
  sub_district?: string
  postal_code?: string
  note?: string
  is_active: boolean
}

export interface VendorPayload {
  name: string
  code?: string
  tax_id?: string
  contact_name?: string
  email?: string
  address?: string
  province?: string
  district?: string
  sub_district?: string
  postal_code?: string
  note?: string
  is_active: boolean
}

export type AttendanceStatus = 'normal' | 'late' | 'absent' | 'holiday'

export interface Attendance {
  id: number
  employee_id: number
  branch_id: number
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  late_minutes: number
  work_minutes: number
  scheduled_start: string | null
  scheduled_end: string | null
  note: string | null
  ip_address: string | null
  updated_by: number | null
  created_at: string
  updated_at: string
  employee?: {
    id: number
    employee_code: string
    first_name: string
    last_name: string
    nickname: string | null
    email: string
    avatar_url: string | null
  }
  branch?: {
    id: number
    name: string
    code: string
  }
}

export interface AttendanceQuery {
  date?: string
  start_date?: string
  end_date?: string
  branch_id?: number
  employee_id?: number
  status?: AttendanceStatus
}

export interface AttendanceUpdatePayload {
  check_in_at?: string
  check_out_at?: string
  status?: AttendanceStatus
  note?: string
}

export interface Holiday {
  id: number
  name: string
  date: string
  branch_id: number | null
  branch_name?: string
  created_at: string
  updated_at: string
}

export interface HolidayPayload {
  name: string
  date: string
  branch_id: number | null
}
