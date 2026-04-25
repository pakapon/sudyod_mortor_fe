import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { stockTransferService } from '@/api/stockTransferService'
import type { StockTransfer, StockTransferStatus } from '@/types/inventory'
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

const STATUS_CONFIG: Record<StockTransferStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-600' },
}

const FALLBACK_STATUS = { label: '-', className: 'bg-gray-100 text-gray-600' }

export function StockTransferListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { permissions } = useAuthStore()

  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

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

  const loadTransfers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await stockTransferService.getStockTransfers({
        status: (status as StockTransferStatus) || undefined,
        page,
        limit,
      })
      setTransfers(res.data.data || [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      setTransfers([])
    } finally {
      setIsLoading(false)
    }
  }, [status, page])

  useEffect(() => { loadTransfers() }, [loadTransfers])

  const handleDelete = (id: number) => { setConfirmDeleteId(id) }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeleteId(id)
    try {
      await stockTransferService.deleteStockTransfer(id)
      loadTransfers()
    } catch {
      // interceptor handles display
    } finally {
      setDeleteId(null)
    }
  }

  const canCreate = hasPermission(permissions, 'stock_transfers', 'can_create')
  const canEdit = hasPermission(permissions, 'stock_transfers', 'can_edit')
  const canDelete = hasPermission(permissions, 'stock_transfers', 'can_delete')
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">โอนย้ายสต็อก</h1>
          <p className="mt-1 text-sm text-gray-500">รายการโอนย้ายสินค้าระหว่างคลัง</p>
        </div>
        {canCreate && (
          <Link
            to="/stock-transfers/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon /> สร้างใบโอนย้าย
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
            <option value="approved">อนุมัติแล้ว</option>
            <option value="completed">เสร็จสิ้น</option>
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
                <th className="px-4 py-3 font-medium text-gray-600">รหัสโอนย้าย</th>
                <th className="px-4 py-3 font-medium text-gray-600">สาขา</th>
                <th className="px-4 py-3 font-medium text-gray-600">จากคลัง</th>
                <th className="px-4 py-3 font-medium text-gray-600">ไปคลัง</th>
                <th className="px-4 py-3 font-medium text-gray-600">รายการ</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3 font-medium text-gray-600">ผู้สร้าง</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">วันที่</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">ไม่พบข้อมูลโอนย้ายสต็อก</td>
                </tr>
              ) : (
                transfers.map((transfer) => {
                  const statusCfg = STATUS_CONFIG[transfer.status] ?? FALLBACK_STATUS
                  const itemsCount = transfer.total_items ?? transfer.items?.length ?? 0
                  const creatorName = transfer.created_by
                    ? `${transfer.created_by.first_name ?? ''} ${transfer.created_by.last_name ?? ''}`.trim() || '—'
                    : '—'
                  return (
                    <tr
                      key={transfer.id}
                      onClick={() => navigate(`/stock-transfers/${transfer.id}`)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{transfer.transfer_no}</td>
                      <td className="px-4 py-3 text-gray-900">{transfer.branch?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-900">{transfer.from_warehouse?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-900">{transfer.to_warehouse?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{itemsCount} รายการ</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{creatorName}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {transfer.created_at ? new Date(transfer.created_at).toLocaleDateString('th-TH') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <ActionIconLink to={`/stock-transfers/${transfer.id}`} variant="view" />
                          {canEdit && transfer.status === 'draft' && (
                            <ActionIconLink to={`/stock-transfers/${transfer.id}/edit`} variant="edit" />
                          )}
                          {canDelete && transfer.status === 'draft' && (
                            <ActionIconButton
                              variant="delete"
                              onClick={() => handleDelete(transfer.id)}
                              disabled={deleteId === transfer.id}
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
              <button disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50">ก่อนหน้า</button>
              <button disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))} className="rounded-lg border border-gray-200 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50">ถัดไป</button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="ยืนยันการลบ"
        message="คุณต้องการลบใบโอนย้ายสินค้ารายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        confirmLabel="ลบ"
        variant="danger"
        isLoading={deleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
