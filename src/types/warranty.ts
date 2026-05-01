export type WarrantyOwnerType = 'service_order' | 'quotation'

export interface Warranty {
  id: number
  warranty_no: string
  owner_type: WarrantyOwnerType
  owner_id: number
  warranty_months?: number
  warranty_km?: number
  start_date: string
  end_date?: string
  conditions?: string
  created_at?: string
  updated_at?: string
}

export interface WarrantyListParams {
  search?: string
  page?: number
  limit?: number
  owner_type?: WarrantyOwnerType
  owner_id?: number
}

export interface CreateWarrantyPayload {
  owner_type: WarrantyOwnerType
  owner_id: number
  warranty_months?: number
  warranty_km?: number
  start_date: string
  conditions?: string
}
