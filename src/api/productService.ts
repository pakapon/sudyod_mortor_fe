import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Product,
  ProductPayload,
  ProductListParams,
  ProductImage,
  ProductPricing,
  ProductPricingPayload,
  ProductUnitConversion,
  ProductUnitConversionPayload,
  BOMItem,
  BOMSetPayload,
  ProductVariant,
  ProductVariantPayload,
  AttributeOption,
  AttributeOptionPayload,
} from '@/types/product'

export const productService = {
  getProducts(params?: ProductListParams) {
    return apiClient.get<PaginatedResponse<Product>>('/products', { params })
  },

  getProduct(id: number) {
    return apiClient.get<ApiResponse<Product>>(`/products/${id}`)
  },

  createProduct(payload: ProductPayload) {
    return apiClient.post<ApiResponse<Product>>('/products', payload)
  },

  updateProduct(id: number, payload: Partial<ProductPayload>) {
    return apiClient.put<ApiResponse<Product>>(`/products/${id}`, payload)
  },

  deleteProduct(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/products/${id}`)
  },

  exportProducts(params?: Omit<ProductListParams, 'page' | 'limit'>) {
    return apiClient.get('/products/export', { params, responseType: 'blob' })
  },

  // Images
  getProductImages(id: number) {
    return apiClient.get<ApiResponse<ProductImage[]>>(`/products/${id}/images`)
  },

  uploadProductImage(id: number, file: File) {
    const formData = new FormData()
    formData.append('image', file)
    return apiClient.post<ApiResponse<ProductImage>>(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteProductImage(productId: number, imageId: number) {
    return apiClient.delete<ApiResponse<null>>(`/products/${productId}/images/${imageId}`)
  },

  reorderProductImages(productId: number, imageIds: number[]) {
    return apiClient.put<ApiResponse<null>>(`/products/${productId}/images/reorder`, { image_ids: imageIds })
  },

  // Pricing
  getProductPricing(id: number) {
    return apiClient.get<ApiResponse<ProductPricing[]>>(`/products/${id}/pricing`)
  },

  updateProductPricing(id: number, pricing: ProductPricingPayload[]) {
    return apiClient.put<ApiResponse<ProductPricing[]>>(`/products/${id}/pricing`, { pricing })
  },

  // Unit Conversions
  getProductUnitConversions(id: number) {
    return apiClient.get<ApiResponse<ProductUnitConversion[]>>(`/products/${id}/unit-conversions`)
  },

  createProductUnitConversion(id: number, payload: ProductUnitConversionPayload) {
    return apiClient.post<ApiResponse<ProductUnitConversion>>(`/products/${id}/unit-conversions`, payload)
  },

  deleteProductUnitConversion(productId: number, conversionId: number) {
    return apiClient.delete<ApiResponse<null>>(`/products/${productId}/unit-conversions/${conversionId}`)
  },

  // BOM
  getProductBOM(id: number, parentSku?: string) {
    return apiClient.get<ApiResponse<BOMItem[]>>(`/products/${id}/bom`, { params: parentSku ? { parent_sku: parentSku } : undefined })
  },

  createBOMSet(id: number, payload: BOMSetPayload) {
    return apiClient.post<ApiResponse<BOMItem[]>>(`/products/${id}/bom`, payload)
  },

  deleteBOMItem(productId: number, bomId: number) {
    return apiClient.delete<ApiResponse<null>>(`/products/${productId}/bom/${bomId}`)
  },

  // Global variant search (for BOM component picker)
  searchVariants(params: { search: string; exclude_product_id?: number; limit?: number }) {
    return apiClient.get<ApiResponse<ProductVariant[]>>('/product-variants', { params })
  },

  // Variants
  getProductVariants(id: number) {
    return apiClient.get<ApiResponse<ProductVariant[]>>(`/products/${id}/variants`)
  },

  createProductVariant(id: number, payload: ProductVariantPayload) {
    return apiClient.post<ApiResponse<ProductVariant>>(`/products/${id}/variants`, payload)
  },

  updateProductVariant(productId: number, variantId: number, payload: Partial<ProductVariantPayload>) {
    return apiClient.put<ApiResponse<ProductVariant>>(`/products/${productId}/variants/${variantId}`, payload)
  },

  deleteProductVariant(productId: number, variantId: number) {
    return apiClient.delete<ApiResponse<null>>(`/products/${productId}/variants/${variantId}`)
  },

  // Attribute Options
  getProductAttributeOptions(id: number) {
    return apiClient.get<ApiResponse<AttributeOption[]>>(`/products/${id}/attribute-options`)
  },

  createProductAttributeOption(id: number, payload: AttributeOptionPayload) {
    return apiClient.post<ApiResponse<AttributeOption>>(`/products/${id}/attribute-options`, payload)
  },

  deleteProductAttributeOption(productId: number, optionId: number) {
    return apiClient.delete<ApiResponse<null>>(`/products/${productId}/attribute-options/${optionId}`)
  },
}
