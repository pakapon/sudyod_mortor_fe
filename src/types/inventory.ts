import type { ProductVariant } from '@/types/product'

// ---- Warehouse ----

export interface Warehouse {
  id: number
  name: string
  code: string
  branch_id?: number
  branch?: { id: number; name: string }
  address?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface WarehousePayload {
  name: string
  code: string
  branch_id?: number
  address?: string
  is_active?: boolean
}

export interface WarehouseListParams {
  search?: string
  branch_id?: number
  is_active?: boolean
  page?: number
  limit?: number
}

export interface WarehouseLocation {
  id: number
  warehouse_id: number
  name: string
  code?: string
  description?: string
  is_active: boolean
}

export interface WarehouseLocationPayload {
  name: string
  code?: string
  description?: string
  is_active?: boolean
}

// ---- Inventory ----

export interface InventoryItem {
  id: number
  product_id: number
  product_variant_id: number
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  variant?: ProductVariant
  warehouse_id: number
  warehouse?: { id: number; name: string }
  branch?: { id: number; name: string }
  location_id?: number
  location?: { id: number; name: string }
  quantity: number
  reserved_quantity?: number
  min_quantity?: number
  updated_at?: string
}

export interface InventoryListParams {
  search?: string
  warehouse_id?: number
  branch_id?: number
  product_id?: number
  low_stock?: boolean
  page?: number
  limit?: number
}

export interface InventoryTransaction {
  id: number
  product_id: number
  product_variant_id?: number
  product?: { id: number; sku: string; name: string }
  variant?: ProductVariant
  warehouse_id: number
  warehouse?: { id: number; name: string }
  transaction_type: string
  quantity_change: number
  quantity_before: number
  quantity_after: number
  reference_type?: string
  reference_id?: number
  notes?: string
  created_at?: string
  employee?: { id: number; first_name: string; last_name: string }
}

export interface InventoryTransactionListParams {
  product_id?: number
  warehouse_id?: number
  type?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface StockAdjustPayload {
  product_variant_id: number
  quantity: number
  reason: string
}

// ---- Goods Receipt ----

export type GoodsReceiptStatus = 'draft' | 'approved' | 'cancelled'

export interface GoodsReceiptItem {
  id: number
  product_id?: number
  product_variant_id: number
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  variant?: ProductVariant
  quantity_ordered: number
  quantity_received?: number
  unit_cost: number
  note?: string | null
  qty?: number
  cost_price?: number
}

export interface GoodsReceiptItemPayload {
  product_variant_id: number
  quantity_ordered: number
  unit_cost: number
}

export type GoodsReceiptDocumentType = 'invoice' | 'delivery_note' | 'receipt' | 'other'

export interface GoodsReceiptDocument {
  id: number
  file_name: string
  file_url: string
  file_type: GoodsReceiptDocumentType
  file_size?: number
  mime_type?: string
  note?: string
  uploaded_at?: string
  uploaded_by?: { id: number; first_name: string; last_name: string }
}

export interface GoodsReceipt {
  id: number
  receipt_no: string
  warehouse_id: number
  warehouse?: { id: number; name: string }
  vendor_id?: number
  vendor?: { id: number; name: string }
  branch_id?: number
  reference_no?: string | null
  received_date?: string
  notes?: string | null
  status: GoodsReceiptStatus
  total_items?: number
  items?: GoodsReceiptItem[]
  documents?: GoodsReceiptDocument[]
  approved_at?: string | null
  approved_by?: { id: number; first_name: string; last_name: string } | null
  received_at?: string | null
  received_by?: { id: number; first_name: string; last_name: string } | number | null
  created_at?: string
  created_by?: { id: number; first_name: string; last_name: string }
}

export interface GoodsReceiptPayload {
  warehouse_id: number
  vendor_id?: number
  reference_no?: string
  received_date?: string
  notes?: string
  items: GoodsReceiptItemPayload[]
}

export interface GoodsReceiptListParams {
  warehouse_id?: number
  vendor_id?: number
  status?: GoodsReceiptStatus
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
}

// ---- Stock Transfer ----

export type StockTransferStatus = 'draft' | 'approved' | 'completed' | 'cancelled'

export interface StockTransferItem {
  id: number
  product_id?: number
  product_variant_id: number
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  variant?: ProductVariant
  quantity: number
  notes?: string | null
}

export interface StockTransferItemPayload {
  product_variant_id: number
  quantity: number
  notes?: string
}

export interface StockTransfer {
  id: number
  transfer_no: string
  branch_id?: number
  branch?: { id: number; name: string }
  from_warehouse_id: number
  from_warehouse?: { id: number; name: string }
  to_warehouse_id: number
  to_warehouse?: { id: number; name: string }
  reason?: string | null
  status: StockTransferStatus
  total_items?: number
  items?: StockTransferItem[]
  approved_at?: string | null
  approved_by?: number | null
  approver?: { id: number; first_name: string; last_name: string } | null
  completed_at?: string | null
  completed_by?: number | null
  cancelled_at?: string | null
  created_at?: string
  created_by?: number
  creator?: { id: number; first_name: string; last_name: string }
}

export interface StockTransferPayload {
  from_warehouse_id: number
  to_warehouse_id: number
  reason?: string
  items: StockTransferItemPayload[]
}

export interface StockTransferListParams {
  branch_id?: number
  from_warehouse_id?: number
  to_warehouse_id?: number
  status?: StockTransferStatus
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
}

// ---- Purchase Order ----

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled'

export interface PurchaseOrderItem {
  id: number
  product_id: number
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  qty: number
  cost_price: number
  total: number
}

export interface PurchaseOrderItemPayload {
  product_id: number
  qty: number
  cost_price: number
}

export interface PurchaseOrder {
  id: number
  po_number: string
  vendor_id: number
  vendor?: { id: number; name: string }
  branch_id?: number
  branch?: { id: number; name: string }
  note?: string
  status: PurchaseOrderStatus
  total_amount: number
  items: PurchaseOrderItem[]
  sent_at?: string
  received_at?: string
  created_at?: string
  created_by?: { id: number; first_name: string; last_name: string }
}

export interface PurchaseOrderPayload {
  vendor_id: number
  branch_id?: number
  note?: string
  items: PurchaseOrderItemPayload[]
}

export interface PurchaseOrderListParams {
  vendor_id?: number
  branch_id?: number
  status?: PurchaseOrderStatus
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
}

// ---- Vendor (shared lookup) ----

export interface Vendor {
  id: number
  name: string
  code?: string
  contact_name?: string
  phone?: string
  email?: string
  tax_id?: string
  address?: string
  is_active: boolean
}
