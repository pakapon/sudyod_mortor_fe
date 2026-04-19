import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Customer,
  CustomerPayload,
  CustomerListParams,
  CustomerPhone,
  CustomerPhonePayload,
  CustomerBillingAddress,
  CustomerBillingAddressPayload,
  CustomerVehicle,
  CustomerVehiclePayload,
  CustomerDocument,
  CustomerDocumentPayload,
  CustomerTimelineEvent,
  CustomerTimelineEventPayload,
  CustomerServiceHistory,
  CustomerPurchaseHistoryInvoice,
  CustomerWarrantyHistory,
  PurchaseHistoryParams,
} from '@/types/customer'

export const customerService = {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  getCustomers(params?: CustomerListParams) {
    return apiClient.get<PaginatedResponse<Customer>>('/customers', { params })
  },

  getCustomer(id: number) {
    return apiClient.get<ApiResponse<Customer>>(`/customers/${id}`)
  },

  createCustomer(payload: CustomerPayload) {
    return apiClient.post<ApiResponse<Customer>>('/customers', payload)
  },

  updateCustomer(id: number, payload: Partial<CustomerPayload>) {
    return apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, payload)
  },

  deleteCustomer(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/customers/${id}`)
  },

  exportCustomers(params?: CustomerListParams) {
    return apiClient.get('/customers/export', { params, responseType: 'blob' })
  },

  // ── Phones ────────────────────────────────────────────────────────────────
  getPhones(customerId: number) {
    return apiClient.get<ApiResponse<CustomerPhone[]>>(`/customers/${customerId}/phones`)
  },

  addPhone(customerId: number, payload: CustomerPhonePayload) {
    return apiClient.post<ApiResponse<CustomerPhone>>(`/customers/${customerId}/phones`, payload)
  },

  updatePhone(customerId: number, phoneId: number, payload: Partial<CustomerPhonePayload>) {
    return apiClient.patch<ApiResponse<CustomerPhone>>(`/customers/${customerId}/phones/${phoneId}`, payload)
  },

  // ── Billing Addresses ─────────────────────────────────────────────────────
  getBillingAddresses(customerId: number) {
    return apiClient.get<ApiResponse<CustomerBillingAddress[]>>(`/customers/${customerId}/billing-addresses`)
  },

  addBillingAddress(customerId: number, payload: CustomerBillingAddressPayload) {
    return apiClient.post<ApiResponse<CustomerBillingAddress>>(`/customers/${customerId}/billing-addresses`, payload)
  },

  updateBillingAddress(customerId: number, addressId: number, payload: Partial<CustomerBillingAddressPayload>) {
    return apiClient.put<ApiResponse<CustomerBillingAddress>>(
      `/customers/${customerId}/billing-addresses/${addressId}`,
      payload,
    )
  },

  // ── Vehicles ──────────────────────────────────────────────────────────────
  getVehicles(customerId: number) {
    return apiClient.get<ApiResponse<CustomerVehicle[]>>(`/customers/${customerId}/vehicles`)
  },

  addVehicle(customerId: number, payload: CustomerVehiclePayload) {
    return apiClient.post<ApiResponse<CustomerVehicle>>(`/customers/${customerId}/vehicles`, payload)
  },

  updateVehicle(customerId: number, vehicleId: number, payload: Partial<CustomerVehiclePayload>) {
    return apiClient.put<ApiResponse<CustomerVehicle>>(
      `/customers/${customerId}/vehicles/${vehicleId}`,
      payload,
    )
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  getDocuments(customerId: number) {
    return apiClient.get<ApiResponse<CustomerDocument[]>>(`/customers/${customerId}/documents`)
  },

  uploadDocument(customerId: number, file: File, payload: CustomerDocumentPayload) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('file_type', payload.file_type)
    if (payload.file_name) formData.append('file_name', payload.file_name)
    if (payload.note) formData.append('note', payload.note)
    return apiClient.post<ApiResponse<CustomerDocument>>(
      `/customers/${customerId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  // ── Timeline ──────────────────────────────────────────────────────────────
  getTimeline(customerId: number) {
    return apiClient.get<ApiResponse<CustomerTimelineEvent[]>>(`/customers/${customerId}/timeline`)
  },

  addTimelineEvent(customerId: number, payload: CustomerTimelineEventPayload) {
    return apiClient.post<ApiResponse<CustomerTimelineEvent>>(`/customers/${customerId}/timeline`, payload)
  },

  // ── History ───────────────────────────────────────────────────────────────
  getServiceHistory(customerId: number) {
    return apiClient.get<ApiResponse<CustomerServiceHistory[]>>(`/customers/${customerId}/service-history`)
  },

  getPurchaseHistory(customerId: number, params?: PurchaseHistoryParams) {
    return apiClient.get<PaginatedResponse<CustomerPurchaseHistoryInvoice>>(
      `/customers/${customerId}/purchase-history`,
      { params },
    )
  },

  getWarrantyHistory(customerId: number) {
    return apiClient.get<ApiResponse<CustomerWarrantyHistory[]>>(`/customers/${customerId}/warranty-history`)
  },

  // ── Photo ─────────────────────────────────────────────────────────────────
  uploadCustomerPhoto(customerId: number, file: File) {
    const formData = new FormData()
    formData.append('photo', file)
    return apiClient.post<ApiResponse<{ photo_url: string }>>(
      `/customers/${customerId}/photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}
