export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export type InvoiceType = 'service' | 'sale' | 'retail'

export type PaymentMethod = 'cash' | 'transfer' | 'credit_card' | 'cheque'

export interface InvoiceItem {
  id: number
  invoice_id: number
  product_id?: number | null
  description: string
  quantity: number
  unit_price: number
  discount?: number
  subtotal: number
}

export interface Payment {
  id: number
  invoice_id: number
  amount: number
  method: PaymentMethod
  reference?: string
  paid_at: string
}

export interface Receipt {
  id: number
  invoice_id: number
  receipt_no: string
  issued_at: string
}

export interface Invoice {
  id: number
  invoice_no: string
  type: InvoiceType
  status: InvoiceStatus
  customer_id: number
  customer?: {
    id: number
    first_name?: string
    last_name?: string
    company_name?: string
    type: 'personal' | 'corporate'
  }
  quotation_id?: number
  service_order_id?: number
  branch_id?: number
  branch?: { id: number; name: string; address?: string; tax_id?: string; phone?: string }
  items?: InvoiceItem[]
  subtotal: number
  vat_percent: number
  vat_amount: number
  grand_total: number
  balance_due?: number
  paid_amount?: number
  deposit_deducted?: number
  due_date?: string
  paid_at?: string
  payments?: Payment[]
  receipt?: Receipt
  created_at?: string
  updated_at?: string
}

export interface InvoiceListParams {
  search?: string
  page?: number
  limit?: number
  status?: InvoiceStatus
  type?: InvoiceType
  branch_id?: number
  customer_id?: number
  service_order_id?: number
  quotation_id?: number
  date_from?: string
  date_to?: string
}

export interface CreateInvoiceFromQTPayload {
  quotation_id: number
  override_amount?: number
}

export interface CreateRetailInvoicePayload {
  customer_id?: number
  items: Array<{
    product_id: number
    product_variant_id?: number
    quantity: number
    unit_price: number
    discount?: number
  }>
  vat_percent?: number
  due_date?: string
  note?: string
  branch_id?: number
}

export interface CreatePaymentPayload {
  amount: number
  method: PaymentMethod
  reference?: string
  paid_at?: string
}
