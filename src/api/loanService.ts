import { apiClient } from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  LoanApplication,
  LoanApplicationListParams,
  CreateLoanApplicationPayload,
  ApproveLoanPayload,
  Guarantor,
  GuarantorPayload,
  LoanDocument,
  LoanDocumentType,
  StoreLoan,
  StoreLoanListParams,
  CreateStoreLoanPayload,
  CalculatePmtResult,
  StoreLoanPayment,
  RecordPaymentPayload,
  LoanSearchResult,
} from '@/types/loans'

export const loanService = {
  // ── Loan Applications ─────────────────────────────────────────────────────

  getLoanApplications(params?: LoanApplicationListParams) {
    return apiClient.get<PaginatedResponse<LoanApplication>>('/loan-applications', { params })
  },

  getLoanApplication(id: number) {
    return apiClient.get<ApiResponse<LoanApplication>>(`/loan-applications/${id}`)
  },

  createLoanApplication(payload: CreateLoanApplicationPayload) {
    return apiClient.post<ApiResponse<LoanApplication>>('/loan-applications', payload)
  },

  updateLoanApplication(id: number, payload: Partial<CreateLoanApplicationPayload>) {
    return apiClient.put<ApiResponse<LoanApplication>>(`/loan-applications/${id}`, payload)
  },

  approveLoanApplication(id: number, payload?: ApproveLoanPayload) {
    return apiClient.patch<ApiResponse<LoanApplication>>(`/loan-applications/${id}/approve`, payload ?? {})
  },

  rejectLoanApplication(id: number, note?: string) {
    return apiClient.patch<ApiResponse<LoanApplication>>(`/loan-applications/${id}/reject`, { note })
  },

  cancelLoanApplication(id: number) {
    return apiClient.patch<ApiResponse<LoanApplication>>(`/loan-applications/${id}/cancel`)
  },

  // ── Guarantors ────────────────────────────────────────────────────────────

  addGuarantor(loanId: number, payload: GuarantorPayload) {
    return apiClient.post<ApiResponse<Guarantor>>(`/loan-applications/${loanId}/guarantors`, payload)
  },

  deleteGuarantor(loanId: number, guarantorId: number) {
    return apiClient.delete<ApiResponse<null>>(`/loan-applications/${loanId}/guarantors/${guarantorId}`)
  },

  // ── Loan Application Documents ────────────────────────────────────────────

  getLoanDocuments(loanId: number) {
    return apiClient.get<ApiResponse<LoanDocument[]>>(`/loan-applications/${loanId}/documents`)
  },

  uploadLoanDocument(
    loanId: number,
    file: File,
    options?: { document_type?: LoanDocumentType; file_name?: string; note?: string },
  ) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', options?.document_type ?? 'other')
    if (options?.file_name) formData.append('file_name', options.file_name)
    if (options?.note) formData.append('note', options.note)
    return apiClient.post<ApiResponse<LoanDocument>>(
      `/loan-applications/${loanId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteLoanDocument(loanId: number, documentId: number) {
    return apiClient.delete<ApiResponse<null>>(`/loan-applications/${loanId}/documents/${documentId}`)
  },

  // ── Store Loans ───────────────────────────────────────────────────────────

  getStoreLoans(params?: StoreLoanListParams) {
    return apiClient.get<PaginatedResponse<StoreLoan>>('/store-loans', { params })
  },

  getStoreLoan(id: number) {
    return apiClient.get<ApiResponse<StoreLoan>>(`/store-loans/${id}`)
  },

  createStoreLoan(payload: CreateStoreLoanPayload) {
    return apiClient.post<ApiResponse<StoreLoan>>('/store-loans', payload)
  },

  cancelStoreLoan(id: number) {
    return apiClient.patch<ApiResponse<StoreLoan>>(`/store-loans/${id}/cancel`)
  },

  calculatePmt(params: { principal: number; interest_rate: number; term_months: number }) {
    return apiClient.get<ApiResponse<CalculatePmtResult>>('/store-loans/0/calculate', { params })
  },

  // ── Store Loan Payments ───────────────────────────────────────────────────

  getPayments(storeLoanId: number) {
    return apiClient.get<ApiResponse<StoreLoanPayment[]>>(`/store-loans/${storeLoanId}/payments`)
  },

  recordPayment(storeLoanId: number, payload: RecordPaymentPayload) {
    return apiClient.post<ApiResponse<StoreLoanPayment>>(`/store-loans/${storeLoanId}/payments`, payload)
  },

  // ── Store Loan Documents ──────────────────────────────────────────────────

  getStoreLoanDocuments(loanId: number) {
    return apiClient.get<ApiResponse<LoanDocument[]>>(`/store-loans/${loanId}/documents`)
  },

  uploadStoreLoanDocument(
    loanId: number,
    file: File,
    options?: { document_type?: LoanDocumentType; file_name?: string; note?: string },
  ) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', options?.document_type ?? 'other')
    if (options?.file_name) formData.append('file_name', options.file_name)
    if (options?.note) formData.append('note', options.note)
    return apiClient.post<ApiResponse<LoanDocument>>(
      `/store-loans/${loanId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteStoreLoanDocument(loanId: number, documentId: number) {
    return apiClient.delete<ApiResponse<null>>(`/store-loans/${loanId}/documents/${documentId}`)
  },

  // ── Loan Search ───────────────────────────────────────────────────────────

  searchLoans(q: string) {
    return apiClient.get<ApiResponse<LoanSearchResult>>('/loans/search', { params: { q } })
  },
}
