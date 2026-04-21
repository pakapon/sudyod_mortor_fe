export type ProductType = 'goods' | 'service'

export interface Product {
  id: number
  sku: string
  name: string
  type: ProductType
  brand_id?: number
  brand?: { id: number; name: string }
  category_id?: number
  category?: { id: number; name: string }
  unit_id?: number
  unit?: { id: number; name: string }
  description?: string
  cost_price?: number | string
  selling_price?: number | string
  min_stock?: number
  stock_qty?: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  // extended fields (may not be in current API)
  tags?: string[]
  weight?: number | string
  height?: number | string
  width?: number | string
  length?: number | string
  vat_code?: string
  main_supplier?: string
  pricing?: {
    id?: number
    cost_price?: string | number
    selling_price?: string | number
    min_price?: string | number
  }
  images?: ProductImage[]
}

export interface ProductPayload {
  sku: string
  name: string
  type: ProductType
  product_type?: string
  brand_id?: number
  category_id?: number
  unit_id?: number
  base_unit_id?: number
  description?: string
  cost_price?: number
  selling_price?: number
  min_stock?: number
  min_quantity?: number
  is_active?: boolean
  vat_code?: string
  vendor_id?: number
  weight_grams?: number
  height_cm?: number
  width_cm?: number
  length_cm?: number
}

export interface ProductListParams {
  search?: string
  brand_id?: number
  category_id?: number
  type?: ProductType
  is_active?: boolean
  page?: number
  limit?: number
}

export interface ProductImage {
  id: number
  product_id: number
  image_url: string
  sort_order: number
}

export interface ProductPricing {
  id: number
  product_id: number
  price_type?: string
  price?: number | string
  min_qty?: number
  unit?: string
  currency?: string
  tax_included?: boolean
  min_margin?: number | string
  max_discount?: number | string
  start_date?: string
  cost_price?: string | number
  selling_price?: string | number
  min_price?: string | number
  created_at?: string
  updated_at?: string
}

export interface ProductPricingPayload {
  price_type: string
  price: number
  min_qty: number
}

export interface ProductUnitConversion {
  id: number
  product_id: number
  from_unit_id: number
  from_unit?: { id: number; name: string }
  to_unit_id: number
  to_unit?: { id: number; name: string }
  factor: number
}

export interface ProductUnitConversionPayload {
  from_unit_id: number
  to_unit_id: number
  factor: number
}

export interface BOMItem {
  id: number
  product_id: number
  component_id: number
  component?: { id: number; sku: string; name: string }
  qty: number
  unit_id: number
  unit?: { id: number; name: string }
}

export interface BOMItemPayload {
  component_id: number
  qty: number
  unit_id: number
}

export interface ProductVariant {
  id: number
  product_id: number
  sku: string
  name: string
  cost_price?: number | string | null
  selling_price?: number | string | null
  attributes?: Record<string, string>
  is_active: boolean
  unit_id?: number
  unit?: { id: number; name: string }
  min_stock?: number
  reorder_point?: number
  track_lot_expiry?: boolean
  track_serial?: boolean
  dimensions?: string
  weight_kg?: number | string | null
  created_at?: string
  updated_at?: string
}

export interface ProductVariantPayload {
  sku: string
  name: string
  cost_price?: number
  selling_price?: number
  attributes?: Record<string, string>
  is_active?: boolean
  unit_id?: number
  min_stock?: number
  reorder_point?: number
  track_lot_expiry?: boolean
  track_serial?: boolean
  dimensions?: string
  weight_kg?: number
}

export interface AttributeOption {
  id: number
  product_id: number
  axis: 1 | 2 | 3
  label?: string
  value: string
  sort_order?: number
}

export interface AttributeOptionPayload {
  axis: 1 | 2 | 3
  label?: string
  value: string
  sort_order?: number
}
