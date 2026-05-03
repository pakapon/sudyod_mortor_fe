export type CustomerType = 'personal' | 'corporate'

export type CustomerStatus = 'active' | 'inactive' | 'blacklisted'

export type CustomerGrade = 'good' | 'bad_credit' | 'poor' | 'new' | 'x'

export const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'personal', label: 'บุคคลธรรมดา' },
  { value: 'corporate', label: 'นิติบุคคล' },
]

export const CUSTOMER_STATUS_OPTIONS: { value: CustomerStatus; label: string; color: string }[] = [
  { value: 'active', label: 'เปิดใช้งาน', color: 'bg-green-100 text-green-700' },
  { value: 'inactive', label: 'ปิดใช้งาน', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'blacklisted', label: 'แบล็คลิสต์', color: 'bg-red-100 text-red-700' },
]

export const CUSTOMER_GRADE_OPTIONS: { value: CustomerGrade; label: string; color: string }[] = [
  { value: 'good', label: 'ดี', color: 'bg-green-100 text-green-700' },
  { value: 'bad_credit', label: 'เครดิตเสีย', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'poor', label: 'แย่', color: 'bg-orange-100 text-orange-700' },
  { value: 'new', label: 'รอประเมินใหม่', color: 'bg-gray-100 text-gray-600' },
]

export type CustomerGender = 'male' | 'female' | 'not_specified'

export type CustomerPhoneType = 'mobile' | 'home' | 'work'

export type CustomerDocFileType = 'id_card' | 'house_registration' | 'other'

export type TimelineEventType = 'call' | 'appointment' | 'note' | 'other'

export type PurchaseItemLineType = 'product' | 'service' | 'discount' | 'free_gift'

export interface Customer {
  id: number
  customer_code?: string
  type: CustomerType
  status: CustomerStatus
  grade?: CustomerGrade
  prefix?: string
  first_name?: string
  last_name?: string
  company_name?: string
  company_branch?: string
  tax_id?: string
  contact_name?: string
  contact_position?: string
  id_card?: string
  email?: string
  line_id?: string
  address?: string
  province?: string
  district?: string
  sub_district?: string
  postal_code?: string
  branch_id: number
  branch?: { id: number; name: string }
  note?: string
  gender?: CustomerGender
  date_of_birth?: string
  registered_at?: string
  grade_updated_at?: string
  credit_limit?: number
  source?: string
  photo_url?: string
  // computed / joined
  primary_phone?: string
  purchase_count?: number
  total_spending?: number
  phones?: CustomerPhone[]
  created_at?: string
  updated_at?: string
}

export interface CustomerPayload {
  type: CustomerType
  customer_code?: string
  status?: CustomerStatus
  grade?: CustomerGrade
  gender?: CustomerGender
  prefix?: string
  first_name?: string
  last_name?: string
  company_name?: string
  company_branch?: string
  tax_id?: string
  contact_name?: string
  contact_position?: string
  id_card?: string
  date_of_birth?: string
  email?: string
  line_id?: string
  address?: string
  province?: string
  district?: string
  sub_district?: string
  postal_code?: string
  branch_id: number
  note?: string
  credit_limit?: number
  source?: string
  grade_updated_at?: string
  phones?: Array<{ type: CustomerPhoneType; number: string; is_primary: boolean }>
  emails?: Array<{ email: string }>
  channels?: Array<{ channel_type: string; channel_id: string }>
  shipping_addresses?: Array<{ label: string; address: string; is_default: boolean }>
}

export interface CustomerListParams {
  search?: string
  type?: CustomerType
  status?: CustomerStatus
  grade?: CustomerGrade
  branch_id?: number
  page?: number
  limit?: number
}

export interface CustomerPhone {
  id: number
  customer_id: number
  type: CustomerPhoneType
  number: string
  is_primary: boolean
}

export interface CustomerPhonePayload {
  type: CustomerPhoneType
  number: string
  is_primary: boolean
}

export interface CustomerBillingAddress {
  id: number
  customer_id: number
  label: string
  address: string
  province: string
  district: string
  sub_district: string
  postal_code: string
  is_default: boolean
}

export interface CustomerBillingAddressPayload {
  label: string
  address: string
  province: string
  district: string
  sub_district: string
  postal_code: string
  is_default: boolean
}

export interface CustomerVehicle {
  id: number
  customer_id: number
  plate_number: string
  brand?: string
  model?: string
  year?: number
  color?: string
  engine_number?: string
  chassis_number?: string
  current_mileage?: number
  is_purchased_here?: boolean
  note?: string
}

export interface CustomerVehiclePayload {
  plate_number: string
  brand?: string
  model?: string
  year?: number
  color?: string
  engine_number?: string
  chassis_number?: string
  current_mileage?: number
  is_purchased_here?: boolean
  note?: string
}

export interface CustomerDocument {
  id: number
  customer_id: number
  file_type: CustomerDocFileType
  file_name?: string
  file_url: string
  note?: string
  uploaded_by?: string
  created_at?: string
}

export interface CustomerDocumentPayload {
  file_type: CustomerDocFileType
  file_name?: string
  note?: string
}

export interface CustomerTimelineEvent {
  id: number
  customer_id: number
  event_type: TimelineEventType
  event_date: string
  description: string
  created_by?: string
  created_at?: string
}

export interface CustomerTimelineEventPayload {
  event_type: TimelineEventType
  event_date: string
  description: string
}

export interface CustomerServiceHistory {
  id: number
  so_number: string
  status: string
  plate_number?: string
  created_at: string
}

export interface CustomerPurchaseHistoryLineItem {
  id?: number
  sort_order?: number
  item_type: PurchaseItemLineType
  product_sku: string | null
  product_name: string
  product_category: string | null
  product_category_code: string | null
  quantity: number
  unit_price: number
  discount: number
  total: number
}

export interface CustomerPurchaseHistoryInvoice {
  invoice_id: number
  invoice_no: string
  invoice_type: string
  invoice_status: string
  payment_status: string
  purchase_date: string
  branch_name: string | null
  service_order_id: number | null
  grand_total: number
  items_count: number
  items: CustomerPurchaseHistoryLineItem[]
}

export interface PurchaseHistoryParams {
  search?: string
  invoice_type?: string
  branch_id?: number
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface CustomerWarrantyHistory {
  id: number
  warranty_number: string
  product_name: string
  expires_at: string
}
