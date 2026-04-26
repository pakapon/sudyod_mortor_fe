import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { inventoryService } from '@/api/inventoryService'
import { warehouseService } from '@/api/warehouseService'
import type { InventoryItem, InventoryTransaction } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

type TabKey = 'all' | 'low_stock' | 'transactions'

const TX_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  goods_receipt: { label: 'รับสินค้า',   className: 'bg-green-100 text-green-700' },
  transfer_in:   { label: 'โอนเข้า',     className: 'bg-blue-100 text-blue-700' },
  transfer_out:  { label: 'โอนออก',      className: 'bg-yellow-100 text-yellow-700' },
  adjustment:    { label: 'ปรับสต็อก',   className: 'bg-purple-100 text-purple-700' },
  cycle_count:   { label: 'นับสต็อก',    className: 'bg-purple-100 text-purple-700' },
  sale:          { label: 'ขาย',         className: 'bg-red-100 text-red-600' },
  service_order: { label: 'ใบสั่งซ่อม', className: 'bg-orange-100 text-orange-700' },
  in:            { label: 'รับเข้า',     className: 'bg-green-100 text-green-700' },
  out:           { label: 'จ่ายออก',     className: 'bg-red-100 text-red-600' },
  adjust:        { label: 'ปรับสต็อก',  className: 'bg-purple-100 text-purple-700' },
  transfer:      { label: 'โอนย้าย',    className: 'bg-blue-100 text-blue-700' },
}

const TX_TYPE_OPTIONS = [
  { value: 'goods_receipt', label: 'รับสินค้า' },
  { value: 'service_order', label: 'ใบสั่งซ่อม' },
  { value: 'transfer_in',   label: 'โอนเข้า' },
  { value: 'transfer_out',  label: 'โอนออก' },
  { value: 'adjustment',    label: 'ปรับสต็อก' },
  { value: 'cycle_count',   label: 'นับสต็อก' },
  { value: 'sale',          label: 'ขาย' },
]

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

const formatVariantText = (color?: string | null, year?: number | string | null) =>
  [color, year].filter(Boolean).join(' ')

export function StockBalancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [txIsLoading, setTxIsLoading] = useState(false)

  const search = searchParams.get('search') ?? ''
  const warehouseId = searchParams.get('warehouse_id') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const txPage = Number(searchParams.get('tx_page') ?? '1')
  const txType = searchParams.get('tx_type') ?? ''
  const txDateFrom = searchParams.get('tx_date_from') ?? ''
  const txDateTo = searchParams.get('tx_date_to') ?? ''
  const limit = 20

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page' && key !== 'tx_page') {
        next.delete('page')
        next.delete('tx_page')
      }
      return next
    })
  }

  useEffect(() => {
    warehouseService.getWarehouses({ limit: 200 })
      .then((res) => setWarehouses(res.data.data ?? []))
      .catch(() => {})
  }, [])

  const loadItems = useCallback(async () => {
    if (activeTab === 'transactions') return
    setIsLoading(true)
    try {
      const params = {
        search: search || undefined,
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
        page,
        limit,
      }
      const res = activeTab === 'low_stock'
        ? await inventoryService.getLowStock(params)
        : await inventoryService.getInventory(params)
      setItems(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [search, warehouseId, page, activeTab])

  const loadTransactions = useCallback(async () => {
    if (activeTab !== 'transactions') return
    setTxIsLoading(true)
    try {
      const res = await inventoryService.getTransactions({
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
        type: txType || undefined,
        date_from: txDateFrom || undefined,
        date_to: txDateTo || undefined,
        page: txPage,
        limit,
      })
      setTransactions(res.data.data || [])
      setTxTotal(res.data.pagination?.total ?? 0)
    } catch {
      setTransactions([])
    } finally {
      setTxIsLoading(false)
    }
  }, [activeTab, warehouseId, txType, txDateFrom, txDateTo, txPage])

  useEffect(() => { loadItems() }, [loadItems])
  useEffect(() => { loadTransactions() }, [loadTransactions])

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
  const txTotalPages = Math.ceil(txTotal / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ภาพรวมสต็อก</h1>
          <p className="mt-1 text-sm text-gray-500">ยอดคงเหลือสินค้าในแต่ละคลังและประวัติการเคลื่อนไหว</p>
        </div>
        {canExport && activeTab !== 'transactions' && (
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
            { key: 'all',          label: 'สต็อกทั้งหมด' },
            { key: 'low_stock',    label: 'สต็อกต่ำกว่าขั้นต่ำ' },
            { key: 'transactions', label: 'ประวัติการเคลื่อนไหว' },
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
        <div className="flex flex-wrap items-center gap-3">
          {activeTab !== 'transactions' && (
            <div className="relative flex-1 min-w-[200px]">
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
          )}
          <select
            value={warehouseId}
            onChange={(e) => setParam('warehouse_id', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">คลังสินค้า (ทั้งหมด)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
          {activeTab === 'transactions' && (
            <>
              <select
                value={txType}
                onChange={(e) => setParam('tx_type', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ประเภท (ทั้งหมด)</option>
                {TX_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={txDateFrom}
                onChange={(e) => setParam('tx_date_from', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="date"
                value={txDateTo}
                onChange={(e) => setParam('tx_date_to', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {/* Stock Table */}
      {activeTab !== 'transactions' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">SKU</th>
                  <th className="px-4 py-3 font-medium text-gray-600">ชื่อสินค้า</th>
                  <th className="px-4 py-3 font-medium text-gray-600">สาขา</th>
                  <th className="px-4 py-3 font-medium text-gray-600">คลัง</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">คงเหลือ</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">จอง</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">พร้อมขาย</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">ขั้นต่ำ</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">ต้นทุน (฿)</th>
                  <th className="px-4 py-3 font-medium text-gray-600">หน่วย</th>
                  <th className="px-4 py-3 font-medium text-gray-600">ตำแหน่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 11 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      {activeTab === 'low_stock' ? 'ไม่มีสินค้าที่สต็อกต่ำกว่าขั้นต่ำ' : 'ไม่พบข้อมูลสต็อก'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const variantText = formatVariantText(item.variant?.color, item.variant?.year)
                    return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.variant?.sku ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.variant?.name ?? '—'}
                        {variantText && <span className="ml-1 text-xs font-normal text-gray-500">({variantText})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.branch?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.warehouse?.name ?? '—'}</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', item.min_quantity != null && item.quantity < item.min_quantity ? 'text-red-600' : 'text-gray-900')}>
                        {item.quantity.toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{item.reserved_quantity != null ? item.reserved_quantity.toLocaleString('th-TH') : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.reserved_quantity != null ? (item.quantity - item.reserved_quantity).toLocaleString('th-TH') : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{item.min_quantity?.toLocaleString('th-TH') ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">—</td>
                      <td className="px-4 py-3 text-gray-600">{item.variant?.unit?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.location?.name ?? '—'}</td>
                    </tr>
                    )
                  })
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
      )}

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">SKU</th>
                  <th className="px-4 py-3 font-medium text-gray-600">ชื่อสินค้า</th>
                  <th className="px-4 py-3 font-medium text-gray-600">คลัง</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">ประเภท</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">จำนวน</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">ยอดหลังปรับ</th>
                  <th className="px-4 py-3 font-medium text-gray-600">อ้างอิง</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 font-medium text-gray-600">ผู้ทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txIsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      ไม่พบประวัติการเคลื่อนไหว
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const txCfg = TX_TYPE_CONFIG[tx.transaction_type] ?? { label: tx.transaction_type, className: 'bg-gray-100 text-gray-600' }
                    const isPositive = (tx.quantity_change ?? 0) > 0
                    const variantText = formatVariantText(tx.variant?.color, tx.variant?.year)
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{tx.variant?.sku ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {tx.variant?.name ?? '—'}
                          {variantText && <span className="ml-1 text-xs font-normal text-gray-500">({variantText})</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{tx.warehouse?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', txCfg.className)}>
                            {txCfg.label}
                          </span>
                        </td>
                        <td className={cn('px-4 py-3 text-right font-semibold', isPositive ? 'text-green-600' : 'text-red-600')}>
                          {isPositive ? '+' : ''}{(tx.quantity_change ?? 0).toLocaleString('th-TH')}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{(tx.quantity_after ?? 0).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {tx.reference_type && tx.reference_id
                            ? `${tx.reference_type} #${tx.reference_id}`
                            : tx.notes ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {tx.employee ? `${tx.employee.first_name} ${tx.employee.last_name}` : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {!txIsLoading && txTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-500">
                แสดง {(txPage - 1) * limit + 1}–{Math.min(txPage * limit, txTotal)} จาก {txTotal.toLocaleString('th-TH')} รายการ
              </p>
              <div className="flex gap-1">
                <button
                  disabled={txPage <= 1}
                  onClick={() => setParam('tx_page', String(txPage - 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  ก่อนหน้า
                </button>
                <button
                  disabled={txPage >= txTotalPages}
                  onClick={() => setParam('tx_page', String(txPage + 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
