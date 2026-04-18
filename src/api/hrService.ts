import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Employee, EmployeePayload, Role, RolePayload, RolePermission, WorkSchedule, WorkSchedulePayload, Position, Branch, BranchPayload, PositionPayload, FinanceCompany, FinanceCompanyPayload, FinanceCompanyDocument, FinanceCompanyDocumentPayload, Attendance, AttendanceQuery, AttendanceUpdatePayload, Holiday, HolidayPayload, Brand, BrandPayload, ProductCategory, ProductCategoryPayload, ProductUnit, ProductUnitPayload, Vendor, VendorPayload } from '@/types/hr'

export const hrService = {
  // Branch Endpoints
  getBranches() {
    return apiClient.get<ApiResponse<Branch[]>>('/branches')
  },

  getBranch(id: number) {
    return apiClient.get<ApiResponse<Branch>>(`/branches/${id}`)
  },

  createBranch(payload: BranchPayload) {
    return apiClient.post<ApiResponse<Branch>>('/branches', payload)
  },

  updateBranch(id: number, payload: Partial<BranchPayload>) {
    return apiClient.put<ApiResponse<Branch>>(`/branches/${id}`, payload)
  },

  deleteBranch(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/branches/${id}`)
  },

  // Position Endpoints
  getPositions() {
    return apiClient.get<ApiResponse<Position[]>>('/positions')
  },

  getPosition(id: number) {
    return apiClient.get<ApiResponse<Position>>(`/positions/${id}`)
  },

  createPosition(payload: PositionPayload) {
    return apiClient.post<ApiResponse<Position>>('/positions', payload)
  },

  updatePosition(id: number, payload: Partial<PositionPayload>) {
    return apiClient.put<ApiResponse<Position>>(`/positions/${id}`, payload)
  },

  deletePosition(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/positions/${id}`)
  },

  // Finance Company Endpoints
  getFinanceCompanies() {
    return apiClient.get<ApiResponse<FinanceCompany[]>>('/finance-companies')
  },

  getFinanceCompany(id: number) {
    return apiClient.get<ApiResponse<FinanceCompany>>(`/finance-companies/${id}`)
  },

  createFinanceCompany(payload: FinanceCompanyPayload) {
    return apiClient.post<ApiResponse<FinanceCompany>>('/finance-companies', payload)
  },

  updateFinanceCompany(id: number, payload: Partial<FinanceCompanyPayload>) {
    return apiClient.put<ApiResponse<FinanceCompany>>(`/finance-companies/${id}`, payload)
  },

  deleteFinanceCompany(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/finance-companies/${id}`)
  },

  uploadFinanceCompanyLogo(id: number, file: File) {
    const formData = new FormData()
    formData.append('logo', file)
    return apiClient.post<ApiResponse<FinanceCompany>>(`/finance-companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getFinanceCompanyDocuments(id: number) {
    return apiClient.get<ApiResponse<FinanceCompanyDocument[]>>(`/finance-companies/${id}/documents`)
  },

  uploadFinanceCompanyDocument(id: number, file: File, payload: FinanceCompanyDocumentPayload) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('file_type', payload.file_type)
    if (payload.file_name) formData.append('file_name', payload.file_name)
    if (payload.note) formData.append('note', payload.note)
    return apiClient.post<ApiResponse<FinanceCompanyDocument>>(`/finance-companies/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteFinanceCompanyDocument(id: number, docId: number) {
    return apiClient.delete<ApiResponse<null>>(`/finance-companies/${id}/documents/${docId}`)
  },

  // Employee Endpoints
  getEmployees() {
    return apiClient.get<PaginatedResponse<Employee>>('/employees')
  },

  getEmployee(id: number) {
    return apiClient.get<ApiResponse<Employee>>(`/employees/${id}`)
  },

  createEmployee(payload: EmployeePayload) {
    return apiClient.post<ApiResponse<Employee>>('/employees', payload)
  },

  updateEmployee(id: number, payload: Partial<EmployeePayload>) {
    return apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, payload)
  },

  deleteEmployee(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/employees/${id}`)
  },

  // Role Endpoints (under /permissions namespace)
  getRoles(params?: { search?: string; is_active?: boolean; page?: number; limit?: number }) {
    return apiClient.get<ApiResponse<Role[]>>('/permissions/roles', { params })
  },

  createRole(payload: RolePayload) {
    return apiClient.post<ApiResponse<Role>>('/permissions/roles', payload)
  },

  updateRole(id: number, payload: Partial<RolePayload>) {
    return apiClient.put<ApiResponse<Role>>(`/permissions/roles/${id}`, payload)
  },

  getRolePermissions(id: number) {
    return apiClient.get<ApiResponse<Role>>(`/permissions/roles/${id}`)
  },

  updateRolePermissions(roleId: number, permissions: RolePermission[]) {
    return apiClient.put<ApiResponse<null>>(`/permissions/roles/${roleId}`, { permissions })
  },

  // Work Schedules Endpoints
  getWorkSchedules(params?: { page?: number; limit?: number }) {
    return apiClient.get<PaginatedResponse<WorkSchedule>>('/work-schedules', { params })
  },

  getWorkSchedule(id: number) {
    return apiClient.get<ApiResponse<WorkSchedule>>(`/work-schedules/${id}`)
  },

  createWorkSchedule(payload: WorkSchedulePayload) {
    return apiClient.post<ApiResponse<WorkSchedule>>('/work-schedules', payload)
  },

  updateWorkSchedule(id: number, payload: Partial<WorkSchedulePayload>) {
    return apiClient.put<ApiResponse<null>>(`/work-schedules/${id}`, payload)
  },

  deleteWorkSchedule(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/work-schedules/${id}`)
  },

  // Attendance Endpoints
  getAttendance(params?: AttendanceQuery) {
    return apiClient.get<ApiResponse<Attendance[]>>('/attendance', { params })
  },

  updateAttendance(id: number, payload: AttendanceUpdatePayload) {
    return apiClient.put<ApiResponse<Attendance>>(`/attendance/${id}`, payload)
  },

  exportAttendance(params: { branch_id?: number; month: string }) {
    return apiClient.get<Blob>('/attendance/export', {
      params,
      responseType: 'blob',
    })
  },

  // Brand Endpoints
  getBrands(params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) {
    return apiClient.get<ApiResponse<Brand[]>>('/brands', { params })
  },

  getBrand(id: number) {
    return apiClient.get<ApiResponse<Brand>>(`/brands/${id}`)
  },

  createBrand(payload: BrandPayload) {
    return apiClient.post<ApiResponse<Brand>>('/brands', payload)
  },

  updateBrand(id: number, payload: Partial<BrandPayload>) {
    return apiClient.put<ApiResponse<Brand>>(`/brands/${id}`, payload)
  },

  deleteBrand(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/brands/${id}`)
  },

  // Product Category Endpoints
  getProductCategories(params?: { page?: number; limit?: number; search?: string; parent_id?: number | null; is_active?: boolean }) {
    return apiClient.get<ApiResponse<ProductCategory[]>>('/product-categories', { params })
  },

  getProductCategory(id: number) {
    return apiClient.get<ApiResponse<ProductCategory>>(`/product-categories/${id}`)
  },

  createProductCategory(payload: ProductCategoryPayload) {
    return apiClient.post<ApiResponse<ProductCategory>>('/product-categories', payload)
  },

  updateProductCategory(id: number, payload: Partial<ProductCategoryPayload>) {
    return apiClient.put<ApiResponse<ProductCategory>>(`/product-categories/${id}`, payload)
  },

  deleteProductCategory(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/product-categories/${id}`)
  },

  // Product Unit Endpoints
  getProductUnits(params?: { page?: number; limit?: number; search?: string }) {
    return apiClient.get<ApiResponse<ProductUnit[]>>('/product-units', { params })
  },

  getProductUnit(id: number) {
    return apiClient.get<ApiResponse<ProductUnit>>(`/product-units/${id}`)
  },

  createProductUnit(payload: ProductUnitPayload) {
    return apiClient.post<ApiResponse<ProductUnit>>('/product-units', payload)
  },

  updateProductUnit(id: number, payload: Partial<ProductUnitPayload>) {
    return apiClient.put<ApiResponse<ProductUnit>>(`/product-units/${id}`, payload)
  },

  deleteProductUnit(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/product-units/${id}`)
  },

  // Vendor Endpoints
  getVendors(params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) {
    return apiClient.get<ApiResponse<Vendor[]>>('/vendors', { params })
  },

  getVendor(id: number) {
    return apiClient.get<ApiResponse<Vendor>>(`/vendors/${id}`)
  },

  createVendor(payload: VendorPayload) {
    return apiClient.post<ApiResponse<Vendor>>('/vendors', payload)
  },

  updateVendor(id: number, payload: Partial<VendorPayload>) {
    return apiClient.put<ApiResponse<Vendor>>(`/vendors/${id}`, payload)
  },

  deleteVendor(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/vendors/${id}`)
  },

  // Holiday Endpoints
  getHolidays(params?: { year?: number; branch_id?: number }) {
    return apiClient.get<ApiResponse<Holiday[]>>('/holidays', { params })
  },

  createHoliday(payload: HolidayPayload) {
    return apiClient.post<ApiResponse<Holiday>>('/holidays', payload)
  },

  updateHoliday(id: number, payload: HolidayPayload) {
    return apiClient.put<ApiResponse<Holiday>>(`/holidays/${id}`, payload)
  },

  deleteHoliday(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/holidays/${id}`)
  },
}
