export interface VehicleInspectionItem {
  id: number
  checklist_id: number
  name: string
  sort_order: number
}

export interface VehicleInspectionChecklist {
  id: number
  vehicle_type: string
  brand: string
  model: string
  year?: number | null
  is_active: boolean
  items: VehicleInspectionItem[]
  items_count?: number
  created_at?: string
  updated_at?: string
}

export interface VehicleInspectionItemPayload {
  name: string
  sort_order: number
}

export interface VehicleInspectionChecklistPayload {
  vehicle_type: string
  brand: string
  model: string
  year?: number | null
  is_active: boolean
  items: VehicleInspectionItemPayload[]
}

export interface VehicleInspectionListQuery {
  search?: string
  is_active?: boolean
  sort?: 'id' | 'brand' | 'model' | 'year' | 'vehicle_type' | 'created_at'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export const VEHICLE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'รถยนต์นั่ง', label: 'รถยนต์นั่ง' },
  { value: 'รถกระบะ', label: 'รถกระบะ' },
  { value: 'รถตู้', label: 'รถตู้' },
  { value: 'SUV', label: 'SUV' },
  { value: 'PPV', label: 'PPV' },
  { value: 'รถบรรทุก', label: 'รถบรรทุก' },
]
