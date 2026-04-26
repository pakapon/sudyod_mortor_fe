import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { productService } from '@/api/productService'
import { warehouseService } from '@/api/warehouseService'
import { RichTextToolbar } from '@/components/RichTextToolbar'
import type { Warehouse, WarehouseLocation, InventoryItem } from '@/types/inventory'
import type { ProductVariant } from '@/types/product'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

type TabKey = 'locations' | 'stock' | 'adjust'

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'locations', label: 'ตำแหน่งในคลัง' },
  { key: 'stock', label: 'สต็อก' },
  { key: 'adjust', label: 'ปรับสต็อก' },
]

const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const lbl = 'mb-1.5 block text-sm font-medium text-gray-700'

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

interface AdjustFormValues {
  product_variant_id: string
  quantity: string
  reason: string
}

const formatVariantOption = (variant: ProductVariant, qty: number) => {
  const variantText = [variant.color, variant.year].filter(Boolean).join(' ')
  const stockText = qty.toLocaleString('th-TH')
  return `${variant.sku} — ${variant.name}${variantText ? ` (${variantText})` : ''} — คงเหลือ ${stockText} ชิ้น`
}

export function WarehouseDetailPage() {
  const { id } = useParams()
  const { permissions } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>('locations')
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [locations, setLocations] = useState<WarehouseLocation[]>([])
  const [stockItems, setStockItems] = useState<InventoryItem[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustSuccess, setAdjustSuccess] = useState(false)

  const warehouseId = Number(id)
  const canEdit = hasPermission(permissions, 'warehouses', 'can_edit')

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AdjustFormValues>({
    defaultValues: { product_variant_id: '', quantity: '', reason: '' },
  })
  const selectedVariantId = watch('product_variant_id')
  const selectedStockItem = selectedVariantId
    ? stockItems.find((item) => String(item.product_variant_id) === selectedVariantId)
    : undefined

  useEffect(() => {
    if (!warehouseId) return
    setIsLoading(true)
    warehouseService.getWarehouse(warehouseId)
      .then((res) => setWarehouse(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [warehouseId])

  useEffect(() => {
    if (!warehouseId) return
    if (activeTab === 'locations') {
      warehouseService.getWarehouseLocations(warehouseId)
        .then((res) => setLocations(res.data.data ?? []))
        .catch(() => {})
    } else if (activeTab === 'stock' || activeTab === 'adjust') {
      warehouseService.getWarehouseInventory(warehouseId, { limit: 100 })
        .then((res) => setStockItems(res.data.data ?? []))
        .catch(() => {})
      productService.searchVariants({ limit: 500 })
        .then((res) => setVariants(res.data.data ?? []))
        .catch(() => {})
    }
  }, [activeTab, warehouseId])

  const handleAdjust = async (values: AdjustFormValues) => {
    setIsAdjusting(true)
    try {
      await warehouseService.adjustStock(warehouseId, {
        product_variant_id: Number(values.product_variant_id),
        quantity: Number(values.quantity),
        reason: values.reason,
      })
      const stockRes = await warehouseService.getWarehouseInventory(warehouseId, { limit: 100 })
      setStockItems(stockRes.data.data ?? [])
      setAdjustSuccess(true)
      reset()
      setTimeout(() => setAdjustSuccess(false), 3000)
    } catch {
      // interceptor handles display
    } finally {
      setIsAdjusting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-gray-100 animate-pulse" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg">ไม่พบข้อมูลคลังสินค้า</p>
        <Link to="/warehouses" className="mt-4 text-sm text-blue-600 hover:underline">กลับไปรายการคลัง</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/warehouses" className="text-gray-400 hover:text-gray-600">
            <ChevronLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>

          </div>
        </div>
        {canEdit && (
          <Link
            to={`/warehouses/${warehouseId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <EditIcon /> แก้ไข
          </Link>
        )}
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">สาขา</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{warehouse.branch?.name ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">ที่อยู่</p>
          <p className="mt-1 text-sm text-gray-900 truncate">{warehouse.address ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">สถานะ</p>
          <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', warehouse.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
            {warehouse.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Locations */}
      {activeTab === 'locations' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อตำแหน่ง</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">รหัส</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">คำอธิบาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">ยังไม่มีตำแหน่งในคลัง</td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{loc.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{loc.code ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{loc.description ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Stock */}
      {activeTab === 'stock' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อสินค้า</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">จำนวน</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">หน่วย</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ตำแหน่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">ไม่มีสต็อกในคลังนี้</td>
                </tr>
              ) : (
                stockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.variant?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {item.variant?.name ?? '—'}
                      {(item.variant?.color || item.variant?.year) && (
                        <span className="ml-1 text-xs text-gray-500">({[item.variant.color, item.variant.year].filter(Boolean).join(' ')})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{(item.quantity ?? 0).toLocaleString('th-TH')}</td>
                    <td className="px-4 py-3 text-gray-600">{item.variant?.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.location?.name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Adjust Stock */}
      {activeTab === 'adjust' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">ปรับจำนวนสต็อก</h2>
              <p className="mt-0.5 text-xs text-gray-500">กำหนดจำนวนสต็อกจริงใหม่ของสินค้าในคลังนี้</p>
            </div>
            {adjustSuccess && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ปรับสต็อกสำเร็จ
              </div>
            )}
            <form onSubmit={handleSubmit(handleAdjust)} className="space-y-5 p-6">
              <div>
                <label className={lbl}>สินค้า / รุ่นย่อย <span className="text-red-500">*</span></label>
                <select
                  {...register('product_variant_id', { required: 'กรุณาเลือกสินค้า' })}
                  className={cn(field, errors.product_variant_id && 'border-red-400')}
                >
                  <option value="">— เลือกสินค้า —</option>
                  {variants.map((variant) => {
                    const stockItem = stockItems.find((item) => item.product_variant_id === variant.id)
                    const qty = stockItem?.quantity ?? 0
                    return <option key={variant.id} value={variant.id}>{formatVariantOption(variant, qty)}</option>
                  })}
                </select>
                {errors.product_variant_id && <p className="mt-1 text-xs text-red-500">{errors.product_variant_id.message}</p>}
              </div>

              {selectedVariantId && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs text-blue-700">จำนวนปัจจุบัน</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-900">
                    {(selectedStockItem?.quantity ?? 0).toLocaleString('th-TH')} <span className="text-sm font-normal">ชิ้น</span>
                  </p>
                </div>
              )}

              <div>
                <label className={lbl}>จำนวนสต็อกจริงใหม่ <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  {...register('quantity', { required: 'กรุณากรอกจำนวน', min: { value: 0, message: 'จำนวนต้องไม่น้อยกว่า 0' } })}
                  className={cn(field, errors.quantity && 'border-red-400')}
                  placeholder="เช่น 7"
                />
                {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
              </div>

              <div>
                <label className={lbl}>เหตุผล <span className="text-red-500">*</span></label>
                <div className={cn('overflow-hidden rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500', errors.reason && 'border-red-400')}>
                  <RichTextToolbar />
                  <textarea
                    {...register('reason', { required: 'กรุณากรอกเหตุผล' })}
                    rows={4}
                    className="w-full border-0 bg-white px-3 py-2.5 text-sm text-gray-700 resize-y focus:outline-none"
                    placeholder="เช่น นับสต็อกใหม่, ปรับตามตรวจนับจริง"
                  />
                </div>
                {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isAdjusting}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isAdjusting ? 'กำลังบันทึก...' : 'บันทึกจำนวนสต็อกใหม่'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-blue-50 p-5">
              <p className="mb-2 text-sm font-semibold text-blue-800">คำแนะนำ</p>
              <ul className="space-y-2 text-xs text-blue-700">
                <li className="flex items-start gap-1.5"><span className="mt-0.5 font-bold">•</span>กรอกจำนวนสต็อกจริงที่ต้องการให้เป็นหลังปรับ ไม่ใช่จำนวนบวกหรือลบ</li>
                <li className="flex items-start gap-1.5"><span className="mt-0.5 font-bold">•</span>ระบบจะคำนวณส่วนต่างจากจำนวนปัจจุบันให้อัตโนมัติ</li>
                <li className="flex items-start gap-1.5"><span className="mt-0.5 font-bold">•</span>กรอก <strong>เหตุผล</strong> เพื่อบันทึกไว้ตรวจสอบย้อนหลัง</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
