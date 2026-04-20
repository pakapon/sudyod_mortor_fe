import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { inventoryService } from '@/api/inventoryService'
import type { InventoryItem } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

type TabKey = 'all' | 'low_stock'

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function StockBalancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const search = searchParams.get('search') ?? ''
  const warehouseId = searchParams.get('warehouse_id') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const limit = 20

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = {
        search: search || undefined,
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
        page,
        limit,
      }
      let res
      if (activeTab === 'low_stock') {
        res = await inventoryService.getLowStock(params)
      } else {
        res = await inventoryService.getInventory(params)
      }
      setItems(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [search, warehouseId, page, activeTab])

  useEffect(() => { loadItems() }, [loadItems])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await inventoryService.exportInventory({
        search: search || undefined,
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
      })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'stock-balance.csv'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // interceptor handles display
    } finally {
      setIsExporting(false)
    }
  }

  const canExport = hasPermission(permissions, 'inventory', 'can_export')
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สต็อกสินค้า</h1>
          <p className="mt-1 text-sm text-gray-500">ยอดคงเหลือสินค้าในแต่ละคลัง</p>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <ExportIcon />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {([
            { key: 'all', label: 'สต็อกทั้งหมด' },
            { key: 'low_stock', label: 'สต็อกต่ำกว่าขั้นต่ำ' },
          ] as { key: TabKey; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setSearchParams(new URLSearchParams())
              }}
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

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า / SKU"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600">ชื่อสินค้า</th>
                <th className="px-4 py-3 font-medium text-gray-600">คลัง</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">จำนวนคงเหลือ</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">สต็อกขั้นต่ำ</th>
                <th className="px-4 py-3 font-medium text-gray-600">หน่วย</th>
                <th className="px-4 py-3 font-medium text-gray-600">ตำแหน่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {activeTab === 'low_stock' ? 'ไม่มีสินค้าที่สต็อกต่ำกว่าขั้นต่ำ' : 'ไม่พบข้อมูลสต็อก'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.product?.sku ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.warehouse?.name ?? '—'}</td>
                    <td className={cn('px-4 py-3 text-right font-semibold', item.min_stock != null && item.qty < item.min_stock ? 'text-red-600' : 'text-gray-900')}>
                      {item.qty.toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.min_stock?.toLocaleString('th-TH') ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.product?.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.location?.name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              แสดง {(page - 1) * limit + 1}–{Math.min(page * limit, total)} จาก {total.toLocaleString('th-TH')} รายการ
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
