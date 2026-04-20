import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { warehouseService } from '@/api/warehouseService'
import type { Warehouse, WarehouseLocation, InventoryItem } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/client'

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
  product_id: string
  qty: string
  note: string
}

export function WarehouseDetailPage() {
  const { id } = useParams()
  const { permissions } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>('locations')
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [locations, setLocations] = useState<WarehouseLocation[]>([])
  const [stockItems, setStockItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustSuccess, setAdjustSuccess] = useState(false)
  const [products, setProducts] = useState<{ id: number; name: string; sku: string }[]>([])

  const warehouseId = Number(id)
  const canEdit = hasPermission(permissions, 'warehouses', 'can_edit')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdjustFormValues>({
    defaultValues: { product_id: '', qty: '', note: '' },
  })

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
    } else if (activeTab === 'stock') {
      warehouseService.getWarehouseInventory(warehouseId, { limit: 100 })
        .then((res) => setStockItems(res.data.data ?? []))
        .catch(() => {})
    } else if (activeTab === 'adjust') {
      apiClient.get('/products?limit=200')
        .then((res) => setProducts(res.data?.data ?? []))
        .catch(() => {})
    }
  }, [activeTab, warehouseId])

  const handleAdjust = async (values: AdjustFormValues) => {
    setIsAdjusting(true)
    try {
      await warehouseService.adjustStock(warehouseId, {
        product_id: Number(values.product_id),
        qty: Number(values.qty),
        note: values.note,
      })
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
            <p className="mt-1 text-sm text-gray-500">รหัส: {warehouse.code}</p>
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
          <p className="text-xs text-gray-500">รหัส</p>
          <p className="mt-1 font-mono text-sm font-semibold text-gray-900">{warehouse.code}</p>
        </div>
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
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.product?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{item.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{item.qty.toLocaleString('th-TH')}</td>
                    <td className="px-4 py-3 text-gray-600">{item.product?.unit?.name ?? '—'}</td>
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
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">ปรับจำนวนสต็อก</h2>
          {adjustSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              ปรับสต็อกสำเร็จ
            </div>
          )}
          <form onSubmit={handleSubmit(handleAdjust)} className="max-w-md space-y-4">
            <div>
              <label className={lbl}>สินค้า <span className="text-red-500">*</span></label>
              <select
                {...register('product_id', { required: 'กรุณาเลือกสินค้า' })}
                className={cn(field, errors.product_id && 'border-red-400')}
              >
                <option value="">— เลือกสินค้า —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
              {errors.product_id && <p className="mt-1 text-xs text-red-500">{errors.product_id.message}</p>}
            </div>
            <div>
              <label className={lbl}>จำนวน (บวก = รับเข้า, ลบ = ตัดออก) <span className="text-red-500">*</span></label>
              <input
                type="number"
                {...register('qty', { required: 'กรุณากรอกจำนวน' })}
                className={cn(field, errors.qty && 'border-red-400')}
                placeholder="เช่น 10 หรือ -5"
              />
              {errors.qty && <p className="mt-1 text-xs text-red-500">{errors.qty.message}</p>}
            </div>
            <div>
              <label className={lbl}>หมายเหตุ</label>
              <input
                {...register('note')}
                className={field}
                placeholder="เหตุผลการปรับสต็อก"
              />
            </div>
            <button
              type="submit"
              disabled={isAdjusting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isAdjusting ? 'กำลังปรับ...' : 'ปรับสต็อก'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
