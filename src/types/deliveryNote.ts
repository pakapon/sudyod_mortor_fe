export type DeliveryNoteOwnerType = 'service_order' | 'quotation'

export interface DeliveryNoteItem {
  id?: number
  product_id?: number
  description: string
  quantity: number
  unit?: string
}

export interface DeliveryNote {
  id: number
  delivery_note_no: string
  owner_type: DeliveryNoteOwnerType
  owner_id: number
  items?: DeliveryNoteItem[]
  signed_at?: string
  signed_by?: string
  created_at?: string
  updated_at?: string
}

export interface CreateDeliveryNotePayload {
  owner_type: DeliveryNoteOwnerType
  owner_id: number
  items?: Omit<DeliveryNoteItem, 'id'>[]
}

export interface SignDeliveryNotePayload {
  signed_by: string
}
