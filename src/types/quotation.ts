export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'

export type QuotationType = 'service' | 'sale'

export type QuotationPricingType = 'part' | 'labor'

export interface QuotationItem {
  id?: number
  quotation_id?: number
  product_id?: number | null
  product_name?: string
  quantity: number
  unit_price: number
  pricing_type: QuotationPricingType
  description?: string
  discount?: number
  subtotal?: number
}

export interface Quotation {
  id: number
  quotation_no: string
  type: QuotationType
  status: QuotationStatus
  customer_id: number
  customer?: {
    id: number
    first_name?: string
    last_name?: string
    company_name?: string
    company_branch?: string
    type: 'personal' | 'corporate'
    tax_id?: string
    address?: string
    province?: string
    district?: string
    sub_district?: string
    postal_code?: string
    primary_phone?: string
  }
  service_order_id?: number
  service_order?: {
    id: number
    so_number?: string
    so_no?: string
  }
  branch_id?: number
  branch?: {
    id: number
    name: string
    address?: string
    tax_id?: string
    phone?: string
  }
  items?: QuotationItem[]
  subtotal?: number
  vat_percent?: number
  vat_amount?: number
  grand_total?: number
  valid_until?: string
  note?: string
  reject_reason?: string
  created_at?: string
  updated_at?: string
}

export interface QuotationListParams {
  search?: string
  page?: number
  limit?: number
  status?: QuotationStatus
  type?: QuotationType
  branch_id?: number
  customer_id?: number
  service_order_id?: number
}

export interface QuotationItemPayload {
  product_id?: number | null
  quantity: number
  unit_price: number
  pricing_type: QuotationPricingType
  description?: string
  discount?: number
}

export interface CreateQuotationPayload {
  customer_id: number
  type: QuotationType
  service_order_id?: number
  validity_days: number
  vat_percent?: number
  note?: string
  items: QuotationItemPayload[]
}

export interface UpdateQuotationPayload {
  customer_id?: number
  type?: QuotationType
  service_order_id?: number
  validity_days?: number
  vat_percent?: number
  note?: string
  items?: QuotationItemPayload[]
}

export interface RejectPayload {
  reject_reason: string
}
