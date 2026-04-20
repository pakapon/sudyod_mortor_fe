import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { purchaseOrderService } from '@/api/purchaseOrderService'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink } from '@/components/ui/ActionIconButton'
import { cn } from '@/lib/utils'

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  sent: { label: 'ส่งแล้ว', className: 'bg-blue-100 text-blue-700' },
  received: { label: 'รับแล้ว', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-600' },
}

export function PurchaseOrderListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const status = searchParams.get('status') ?? ''
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

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await purchaseOrderService.getPurchaseOrders({
        status: (status as PurchaseOrderStatus) || undefined,
        page,
        limit,
      })
      setOrders(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [status, page])

  useEffect(() => { loadOrders() }, [loadOrders])

  const canCreate = hasPermission(permissions, 'purchase_orders', 'can_create')
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบสั่งซื้อ</h1>
          <p className="mt-1 text-sm text-gray-500">รายการใบสั่งซื้อทั้งหมด</p>
        </div>
        {canCreate && (
          <Link
            to="/purchase-orders/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon /> สร้างใบสั่งซื้อ
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="draft">ร่าง</option>
            <option value="sent">ส่งแล้ว</option>
            <option value="received">รับแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">เลข PO</th>
                <th className="px-4 py-3 font-medium text-gray-600">Vendor</th>
                <th className="px-4 py-3 font-medium text-gray-600">สาขา</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right whitespace-nowrap">ยอดรวม</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">วันที่</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">ไม่พบข้อมูลใบสั่งซื้อ</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status]
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{order.po_number}</td>
                      <td className="px-4 py-3 text-gray-900">{order.vendor?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{order.branch?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {order.total_amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionIconLink to={`/purchase-orders/${order.id}`} variant="view" />
                      </td>
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
              <button disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50">ก่อนหน้า</button>
              <button disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))} className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50">ถัดไป</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
