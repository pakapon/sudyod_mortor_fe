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

export const INSPECTION_STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'ปกติ',         label: 'ปกติ',         color: 'bg-green-100 text-green-700' },
  { value: 'เสีย',         label: 'เสีย',         color: 'bg-red-100 text-red-700' },
  { value: 'ชำรุด',        label: 'ชำรุด',        color: 'bg-orange-100 text-orange-700' },
  { value: 'ต้องซ่อม',    label: 'ต้องซ่อม',    color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ต้องเปลี่ยน', label: 'ต้องเปลี่ยน', color: 'bg-red-200 text-red-800' },
  { value: 'ไม่เกี่ยวข้อง', label: 'ไม่เกี่ยวข้อง', color: 'bg-gray-100 text-gray-500' },
]
