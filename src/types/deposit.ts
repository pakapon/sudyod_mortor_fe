export type DepositStatus = 'collected' | 'refunded'

export type DepositPaymentMethod = 'cash' | 'transfer' | 'credit_card'

export interface Deposit {
  id: number
  deposit_no: string
  quotation_id: number
  customer_id: number
  amount: number
  payment_method: DepositPaymentMethod
  receipt_number?: string
  status: DepositStatus
  created_at?: string
  updated_at?: string
}

export interface DepositListParams {
  search?: string
  page?: number
  limit?: number
  status?: DepositStatus
  customer_id?: number
  quotation_id?: number
}

export interface CreateDepositPayload {
  quotation_id: number
  amount: number
  payment_method: DepositPaymentMethod
  reference?: string
}
