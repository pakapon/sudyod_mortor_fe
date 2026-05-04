export type ServiceOrderStatus =
  | 'draft'
  | 'pending_review'
  | 'pending_quote'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'pending_payment'
  | 'pending_pickup'
  | 'closed'
  | 'cancelled'

export type GpsPhotoType = 'pre_intake' | 'damage_spot' | 'pre_repair' | 'pre_delivery' | 'delivery'

export type ServiceOrderItemType = 'product' | 'service'

export interface ServiceOrderItem {
  id: number
  service_order_id: number
  item_type: ServiceOrderItemType
  product_id?: number
  product_variant_id?: number
  product?: { id: number; name: string; sku?: string }
  variant?: { id: number; name: string; sku?: string }
  custom_name?: string
  quantity: number
  unit_price: number
  discount?: number
  total_price: number
  total?: number
  notes?: string
  is_additional?: boolean
}

export interface ServiceOrderGpsPhoto {
  id: number
  service_order_id: number
  type: GpsPhotoType
  photo_url: string
  latitude?: number
  longitude?: number
  taken_at?: string
  created_at?: string
}

export interface ServiceOrder {
  id: number
  so_number: string
  status: ServiceOrderStatus
  customer_id: number
  customer?: {
    id: number
    first_name?: string
    last_name?: string
    company_name?: string
    type: 'personal' | 'corporate'
  }
  vehicle_id?: number
  vehicle?: {
    id: number
    plate_number: string
    brand?: string
    model?: string
    year?: number
  }
  branch_id: number
  branch?: { id: number; name: string }
  technician_id?: number
  technician?: {
    id: number
    first_name?: string
    last_name?: string
  }
  symptom: string
  diagnosis?: string
  internal_note?: string
  mileage?: number
  received_date: string
  expected_completion_date?: string
  is_quick_repair?: boolean
  items?: ServiceOrderItem[]
  gps_photos?: ServiceOrderGpsPhoto[]
  created_at?: string
  updated_at?: string
}

export interface ServiceOrderSummary {
  draft: number
  pending_review: number
  pending_quote: number
  approved: number
  in_progress: number
  completed: number
  pending_payment: number
  pending_pickup: number
  closed: number
  cancelled: number
}

export interface ServiceOrderListParams {
  search?: string
  page?: number
  limit?: number
  status?: ServiceOrderStatus
  branch_id?: number
  technician_id?: number
  date_from?: string
  date_to?: string
}

export interface CreateServiceOrderPayload {
  customer_id: number
  vehicle_id?: number
  branch_id: number
  symptom: string
  mileage?: number
  received_date: string
  expected_completion_date?: string
  is_quick_repair?: boolean
}

export interface UpdateServiceOrderPayload {
  symptom?: string
  mileage?: number
  received_date?: string
  expected_completion_date?: string
  is_quick_repair?: boolean
  diagnosis?: string
  internal_note?: string
}

export interface ServiceOrderItemPayload {
  item_type: ServiceOrderItemType
  product_id?: number
  product_variant_id?: number
  custom_name?: string
  quantity: number
  unit_price: number
  discount?: number
  pricing_type?: 'labor' | 'part' | 'service'
  notes?: string
}

export interface TransitionPayload {
  status?: ServiceOrderStatus
  target_status?: ServiceOrderStatus
  note?: string
}

export interface AssignPayload {
  technician_id: number
}
