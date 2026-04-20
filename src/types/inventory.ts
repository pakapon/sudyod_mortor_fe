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
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  warehouse_id: number
  warehouse?: { id: number; name: string }
  location_id?: number
  location?: { id: number; name: string }
  qty: number
  min_stock?: number
  updated_at?: string
}

export interface InventoryListParams {
  search?: string
  warehouse_id?: number
  product_id?: number
  low_stock?: boolean
  page?: number
  limit?: number
}

export interface InventoryTransaction {
  id: number
  product_id: number
  product?: { id: number; sku: string; name: string }
  warehouse_id: number
  warehouse?: { id: number; name: string }
  type: 'in' | 'out' | 'adjust' | 'transfer'
  qty: number
  balance: number
  reference_type?: string
  reference_id?: number
  note?: string
  created_at?: string
  created_by?: { id: number; first_name: string; last_name: string }
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
  product_id: number
  location_id?: number
  qty: number
  note: string
}

// ---- Goods Receipt ----

export type GoodsReceiptStatus = 'draft' | 'received' | 'cancelled'

export interface GoodsReceiptItem {
  id: number
  product_id: number
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  qty: number
  cost_price: number
}

export interface GoodsReceiptItemPayload {
  product_id: number
  qty: number
  cost_price: number
}

export interface GoodsReceipt {
  id: number
  code: string
  warehouse_id: number
  warehouse?: { id: number; name: string }
  vendor_id?: number
  vendor?: { id: number; name: string }
  reference_no?: string
  note?: string
  status: GoodsReceiptStatus
  items: GoodsReceiptItem[]
  approved_at?: string
  approved_by?: { id: number; first_name: string; last_name: string }
  created_at?: string
  created_by?: { id: number; first_name: string; last_name: string }
}

export interface GoodsReceiptPayload {
  warehouse_id: number
  vendor_id?: number
  reference_no?: string
  note?: string
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

export type StockTransferStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface StockTransferItem {
  id: number
  product_id: number
  product?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  qty: number
}

export interface StockTransferItemPayload {
  product_id: number
  qty: number
}

export interface StockTransfer {
  id: number
  code: string
  from_warehouse_id: number
  from_warehouse?: { id: number; name: string }
  to_warehouse_id: number
  to_warehouse?: { id: number; name: string }
  note?: string
  status: StockTransferStatus
  items: StockTransferItem[]
  approved_at?: string
  approved_by?: { id: number; first_name: string; last_name: string }
  created_at?: string
  created_by?: { id: number; first_name: string; last_name: string }
}

export interface StockTransferPayload {
  from_warehouse_id: number
  to_warehouse_id: number
  note?: string
  items: StockTransferItemPayload[]
}

export interface StockTransferListParams {
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
