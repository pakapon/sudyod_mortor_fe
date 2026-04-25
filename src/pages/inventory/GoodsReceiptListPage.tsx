import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { goodsReceiptService } from '@/api/goodsReceiptService'
import type { GoodsReceipt, GoodsReceiptStatus } from '@/types/inventory'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { ActionIconLink, ActionIconButton } from '@/components/ui/ActionIconButton'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const STATUS_CONFIG: Record<GoodsReceiptStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  approved: { label: 'รับแล้ว', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-600' },
}
const FALLBACK_STATUS = { label: '-', className: 'bg-gray-100 text-gray-500' }

export function GoodsReceiptListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const search = searchParams.get('search') ?? ''
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

  const loadReceipts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await goodsReceiptService.getGoodsReceipts({
        search: search || undefined,
        status: (status as GoodsReceiptStatus) || undefined,
        page,
        limit,
      })
      setReceipts(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setReceipts([])
    } finally {
      setIsLoading(false)
    }
  }, [search, status, page])

  useEffect(() => { loadReceipts() }, [loadReceipts])

  const handleDelete = (id: number) => { setConfirmDeleteId(id) }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeleteId(id)
    try {
      await goodsReceiptService.deleteGoodsReceipt(id)
      loadReceipts()
    } catch {
      // interceptor handles display
    } finally {
      setDeleteId(null)
    }
  }

  const canCreate = hasPermission(permissions, 'goods_receipts', 'can_create')
  const canDelete = hasPermission(permissions, 'goods_receipts', 'can_delete')
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบรับสินค้า</h1>
          <p className="mt-1 text-sm text-gray-500">รายการใบรับสินค้าทั้งหมด</p>
        </div>
        {canCreate && (
          <Link
            to="/goods-receipts/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon />
            สร้างใบรับสินค้า
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="ค้นหาเลขอ้างอิง"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[200px]"
          />
          <select
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="draft">ร่าง</option>
            <option value="approved">รับแล้ว</option>
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
                <th className="px-4 py-3 font-medium text-gray-600">รหัสใบรับ</th>
                <th className="px-4 py-3 font-medium text-gray-600">คลังสินค้า</th>
                <th className="px-4 py-3 font-medium text-gray-600">Vendor</th>
                <th className="px-4 py-3 font-medium text-gray-600">อ้างอิง</th>
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
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูลใบรับสินค้า
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const statusCfg = STATUS_CONFIG[receipt.status] ?? FALLBACK_STATUS
                  return (
                    <tr
                      key={receipt.id}
                      onClick={() => navigate(`/goods-receipts/${receipt.id}`)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{receipt.receipt_no}</td>
                      <td className="px-4 py-3 text-gray-900">{receipt.warehouse?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{receipt.vendor?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{receipt.reference_no ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {receipt.received_date
                          ? new Date(receipt.received_date).toLocaleDateString('th-TH')
                          : receipt.created_at
                            ? new Date(receipt.created_at).toLocaleDateString('th-TH')
                            : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <ActionIconLink to={`/goods-receipts/${receipt.id}`} title="ดูรายละเอียด" variant="view" />
                          {receipt.status === 'draft' && (
                            <ActionIconLink to={`/goods-receipts/${receipt.id}/edit`} title="แก้ไข" variant="edit" />
                          )}
                          {canDelete && receipt.status === 'draft' && (
                            <ActionIconButton
                              onClick={() => handleDelete(receipt.id)}
                              title="ลบ"
                              variant="delete"
                              disabled={deleteId === receipt.id}
                            />
                          )}
                        </div>
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

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="ยืนยันการลบ"
        message="คุณต้องการลบใบรับสินค้ารายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
