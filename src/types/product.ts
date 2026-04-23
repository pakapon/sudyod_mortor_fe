export type ProductType = 'goods' | 'service'

export interface Product {
  id: number
  sku: string
  name: string
  type?: ProductType
  product_type?: string
  brand_id?: number
  brand?: { id: number; name: string }
  category_id?: number
  category?: { id: number; name: string }
  unit_id?: number
  unit?: { id: number; name: string }
  base_unit_id?: number
  base_unit?: { id: number; name: string; abbreviation?: string }
  vendor_id?: number
  vendor?: { id: number; name: string }
  description?: string
  cost_price?: number | string
  selling_price?: number | string
  min_stock?: number
  min_quantity?: number
  stock_qty?: number
  is_active: boolean
  vat_code?: string
  weight_grams?: number | string
  height_cm?: number | string
  width_cm?: number | string
  length_cm?: number | string
  created_at?: string
  updated_at?: string
  tags?: Array<string | { id: number; name: string; created_at?: string; updated_at?: string; pivot?: unknown }>
  pricing?: {
    id?: number
    cost_price?: string | number
    selling_price?: string | number
    min_price?: string | number
  }
  pricing_tiers?: ProductPricing[]
  images?: ProductImage[]
  variants?: ProductVariant[]
  attachments?: Array<{ id: number; filename: string; file_url: string; mime_type: string; size_bytes: number }>
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
  tags?: string[]
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
  tier_name?: string
  cost_price?: string | number
  selling_price?: string | number
  min_price?: string | number
  currency?: string
  include_tax?: boolean
  min_qty?: number
  min_discount_pct?: number | string | null
  max_discount_pct?: number | string | null
  effective_date?: string | null
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
  parent_product_id: number
  parent_variant_id: number
  child_variant_id: number
  child_product_id: number
  unit_id: number
  quantity: string
  parent_variant?: { id: number; sku: string; name: string; bom_stock_policy?: string }
  child_variant?: { id: number; sku: string; name: string; unit?: { id: number; name: string } }
  child_product?: { id: number; name: string }
}

export interface BOMSetPayload {
  parent_sku: string
  components: { sku: string; quantity: number }[]
  bom_stock_policy?: 'auto' | 'manual'
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
  unit_quantity?: number | null
  min_stock?: number
  reorder_point?: number
  track_lot_expiry?: boolean
  track_serial?: boolean
  description?: string | null
  barcode?: string | null
  barcode_secondary?: string | null
  dimensions?: string
  dimension_width?: number | null
  dimension_height?: number | null
  dimension_length?: number | null
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
  unit_quantity?: number
  min_stock?: number
  reorder_point?: number
  track_lot_expiry?: boolean
  track_serial?: boolean
  description?: string
  barcode?: string
  barcode_secondary?: string
  dimension_width?: number
  dimension_height?: number
  dimension_length?: number
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
