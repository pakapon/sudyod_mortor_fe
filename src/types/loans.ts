// ── Status types ─────────────────────────────────────────────────────────────
export type LoanApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type StoreLoanStatus = 'active' | 'completed' | 'overdue' | 'cancelled'
export type LoanDocumentType =
  | 'id_card'
  | 'bank_statement'
  | 'salary_slip'
  | 'house_registration'
  | 'vehicle_registration'
  | 'other'
export type PaymentMethod = 'cash' | 'transfer' | 'credit_card' | 'cheque'

// ── Shared ────────────────────────────────────────────────────────────────────
export interface LoanDocument {
  id: number
  file_url: string
  file_name: string
  document_type: LoanDocumentType
  note?: string | null
  file_size?: number | null
  created_at?: string | null
  uploaded_by?: { id: number; first_name?: string; last_name?: string } | null
}

// ── Guarantor ─────────────────────────────────────────────────────────────────
export interface Guarantor {
  id: number
  name: string
  phone?: string | null
  id_card?: string | null
  address?: string | null
  relationship?: string | null
  created_at?: string | null
}

export interface GuarantorPayload {
  name: string
  phone?: string
  id_card?: string
  address?: string
  relationship?: string
}

// ── Loan Application ──────────────────────────────────────────────────────────
export interface LoanApplication {
  id: number
  application_no: string
  status: LoanApplicationStatus
  branch_id: number
  branch?: { id: number; name: string } | null
  finance_company_id: number
  finance_company?: { id: number; name: string } | null
  customer_id?: number | null
  customer?: { id: number; first_name?: string; last_name?: string; name?: string } | null
  applicant_name: string
  applicant_phone?: string | null
  applicant_id_card?: string | null
  amount_requested: number
  down_payment?: number | null
  applied_date: string
  // Approval fields
  amount_approved?: number | null
  approved_date?: string | null
  loan_amount?: number | null
  interest_rate?: number | null
  term_months?: number | null
  monthly_payment?: number | null
  // References
  vehicle_id?: number | null
  quotation_id?: number | null
  invoice_id?: number | null
  note?: string | null
  guarantors?: Guarantor[]
  documents?: LoanDocument[]
  created_by?: { id: number; first_name?: string; last_name?: string } | null
  created_at?: string | null
  updated_at?: string | null
}

export interface LoanApplicationListParams {
  search?: string
  page?: number
  limit?: number
  branch_id?: number | string
  status?: LoanApplicationStatus | ''
  finance_company_id?: number | string
  customer_id?: number | string
  date_from?: string
  date_to?: string
}

export interface CreateLoanApplicationPayload {
  branch_id: number
  finance_company_id: number
  applicant_name: string
  amount_requested: number
  applied_date: string
  applicant_phone?: string
  applicant_id_card?: string
  down_payment?: number
  customer_id?: number
  vehicle_id?: number
  quotation_id?: number
  invoice_id?: number
  note?: string
  guarantors?: GuarantorPayload[]
}

export interface ApproveLoanPayload {
  amount_approved?: number
  approved_date?: string
  loan_amount?: number
  interest_rate?: number
  term_months?: number
  monthly_payment?: number
  note?: string
}

// ── Store Loan ────────────────────────────────────────────────────────────────
export interface StoreLoan {
  id: number
  loan_no: string
  status: StoreLoanStatus
  branch_id: number
  branch?: { id: number; name: string } | null
  customer_id: number
  customer?: { id: number; first_name?: string; last_name?: string; name?: string } | null
  customer_name: string
  customer_phone?: string | null
  customer_id_card?: string | null
  total_amount: number
  down_payment?: number | null
  principal?: number | null
  interest_rate: number
  term_months: number
  monthly_payment: number
  start_date: string
  next_due_date?: string | null
  invoice_id?: number | null
  note?: string | null
  documents?: LoanDocument[]
  created_by?: { id: number; first_name?: string; last_name?: string } | null
  created_at?: string | null
  updated_at?: string | null
}

export interface StoreLoanListParams {
  search?: string
  page?: number
  limit?: number
  branch_id?: number | string
  status?: StoreLoanStatus | ''
  customer_id?: number | string
}

export interface CreateStoreLoanPayload {
  branch_id: number
  customer_id: number
  customer_name: string
  total_amount: number
  interest_rate: number
  term_months: number
  monthly_payment: number
  start_date: string
  next_due_date: string
  down_payment?: number
  principal?: number
  customer_phone?: string
  customer_id_card?: string
  invoice_id?: number
  note?: string
}

export interface CalculateScheduleItem {
  installment: number
  payment_date: string
  beginning_balance: number
  payment: number
  principal: number
  interest: number
  ending_balance: number
}

export interface CalculatePmtSummary {
  principal: number
  interest_rate: number
  term_months: number
  monthly_payment: number
  total_paid: number
  total_interest: number
  total_principal_paid: number
  first_payment_date: string
  last_payment_date: string
}

export interface CalculatePmtResult {
  summary: CalculatePmtSummary
  schedule: CalculateScheduleItem[]
}

// ── Payment ───────────────────────────────────────────────────────────────────
export interface StoreLoanPayment {
  id: number
  store_loan_id: number
  amount: number
  method: PaymentMethod
  reference_no?: string | null
  paid_at?: string | null
  receipt_url?: string | null
  note?: string | null
  created_by?: { id: number; first_name?: string; last_name?: string } | null
  created_at?: string | null
}

export interface RecordPaymentPayload {
  amount: number
  method: PaymentMethod
  reference_no?: string
  paid_at?: string
  receipt_url?: string
  note?: string
}

// ── Loan Search ───────────────────────────────────────────────────────────────
export interface LoanSearchHit<T> {
  id: number
  score: number
  data: T
}

export interface LoanSearchResult {
  as_applicant: LoanSearchHit<LoanApplication>[]
  as_guarantor: LoanSearchHit<Guarantor & { loan_application?: LoanApplication }>[]
  store_loans: LoanSearchHit<StoreLoan>[]
}
