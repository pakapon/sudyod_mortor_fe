import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { purchaseOrderService } from '@/api/purchaseOrderService'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  sent: { label: 'ส่งแล้ว', className: 'bg-blue-100 text-blue-700' },
  received: { label: 'รับแล้ว', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-600' },
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuthStore()

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState(false)

  const canEdit = hasPermission(permissions, 'purchase_orders', 'can_edit')

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    purchaseOrderService.getPurchaseOrder(Number(id))
      .then((res) => setOrder(res.data.data))
      .catch(() => navigate('/purchase-orders', { replace: true }))
      .finally(() => setIsLoading(false))
  }, [id, navigate])

  const handleSend = async () => {
    if (!order || !window.confirm('ยืนยันการส่ง PO?')) return
    setIsActioning(true)
    try {
      await purchaseOrderService.sendPurchaseOrder(order.id)
      setOrder((prev) => prev ? { ...prev, status: 'sent' } : null)
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const handleReceive = async () => {
    if (!order || !window.confirm('ยืนยันการรับสินค้า?')) return
    setIsActioning(true)
    try {
      await purchaseOrderService.receivePurchaseOrder(order.id)
      setOrder((prev) => prev ? { ...prev, status: 'received' } : null)
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  const handleCancel = async () => {
    if (!order || !window.confirm('ยืนยันการยกเลิก PO?')) return
    setIsActioning(true)
    try {
      await purchaseOrderService.cancelPurchaseOrder(order.id)
      navigate('/purchase-orders')
    } catch {
      // interceptor handles display
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-20 rounded-xl border border-gray-200 bg-gray-100 animate-pulse" />))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />))}
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const statusCfg = STATUS_CONFIG[order.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/purchase-orders" className="text-gray-400 hover:text-gray-600"><ChevronLeftIcon /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ใบสั่งซื้อ: {order.po_number}</h1>
            <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusCfg.className)}>
              {statusCfg.label}
            </span>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {order.status === 'draft' && (
              <button
                onClick={handleSend}
                disabled={isActioning}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                ส่ง PO
              </button>
            )}
            {order.status === 'sent' && (
              <button
                onClick={handleReceive}
                disabled={isActioning}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                รับสินค้า
              </button>
            )}
            {(order.status === 'draft' || order.status === 'sent') && (
              <button
                onClick={handleCancel}
                disabled={isActioning}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                ยกเลิก
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Vendor</p>
          <p className="font-semibold text-gray-900">{order.vendor?.name ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">สาขา</p>
          <p className="font-semibold text-gray-900">{order.branch?.name ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">วันที่สร้าง</p>
          <p className="font-semibold text-gray-900">
            {order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH') : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">ยอดรวม</p>
          <p className="text-lg font-bold text-gray-900">
            {order.total_amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
          </p>
        </div>
      </div>

      {/* Note */}
      {order.note && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">หมายเหตุ</p>
          <p className="text-sm text-gray-700">{order.note}</p>
        </div>
      )}

      {/* Items table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">รายการสินค้า ({order.items?.length ?? 0} รายการ)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">#</th>
                <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600">สินค้า</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จำนวน</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">ราคาต้นทุน</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(order.items ?? []).map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.product?.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-900">{item.product?.name ?? `#${item.product_id}`}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {item.qty.toLocaleString('th-TH')} {item.product?.unit?.name ?? ''}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {item.cost_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700">ยอดรวมทั้งสิ้น</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                  {order.total_amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
